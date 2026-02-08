"""Unified client for calling different LLM providers."""
import os
import time
from abc import ABC, abstractmethod
from typing import Dict, Optional

import httpx
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.models.schemas import ModelOutput


class ModelClient(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelOutput:
        """Generate a response from the model."""
        pass

    @abstractmethod
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost in USD for the given token counts."""
        pass


# Shared pricing for OpenAI models
OPENAI_PRICING = {
    # GPT-5 and GPT-4.1 series
    "gpt-5": {"input": 5.00, "output": 15.00},
    "gpt-5.2": {"input": 5.00, "output": 15.00},
    "gpt-4.1": {"input": 2.00, "output": 8.00},
    "gpt-4.1-mini": {"input": 0.40, "output": 1.60},
    "gpt-4.1-nano": {"input": 0.10, "output": 0.40},
    # GPT-4o series
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    "gpt-4-turbo-preview": {"input": 10.00, "output": 30.00},
    "gpt-4": {"input": 30.00, "output": 60.00},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    # Reasoning models
    "o4-mini": {"input": 2.00, "output": 8.00},
    "o3": {"input": 20.00, "output": 80.00},
    "o3-mini": {"input": 1.10, "output": 4.40},
    "o1": {"input": 15.00, "output": 60.00},
    "o1-mini": {"input": 3.00, "output": 12.00},
    "o1-pro": {"input": 150.00, "output": 600.00},
    # Codex models (Responses API)
    "codex-mini": {"input": 1.50, "output": 6.00},
    "codex-mini-latest": {"input": 1.50, "output": 6.00},
    "codex-5.2": {"input": 3.00, "output": 12.00},
}


class OpenAICompletionsClient(ModelClient):
    """Client for OpenAI models via Chat Completions API (GPT-5, o-series, etc.)."""

    PRICING = OPENAI_PRICING

    # Models that require max_completion_tokens instead of max_tokens
    MAX_COMPLETION_TOKENS_MODELS = {'o1', 'o3', 'o4', 'gpt-5', 'gpt-5.2'}

    def __init__(self, api_key: str, model_id: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model_id = model_id
        # Check if model requires max_completion_tokens
        self.uses_max_completion_tokens = any(
            model_id.startswith(prefix) for prefix in self.MAX_COMPLETION_TOKENS_MODELS
        )
        self.is_reasoning_model = model_id.startswith(('o1', 'o3', 'o4'))

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelOutput:
        start_time = time.time()

        try:
            create_kwargs = {
                "model": self.model_id,
                "messages": [{"role": "user", "content": prompt}],
            }
            
            # GPT-5+ and reasoning models use max_completion_tokens
            if self.uses_max_completion_tokens:
                create_kwargs["max_completion_tokens"] = max_tokens
            else:
                create_kwargs["max_tokens"] = max_tokens
            
            # Reasoning models don't support temperature
            if not self.is_reasoning_model:
                create_kwargs["temperature"] = temperature

            response = await self.client.chat.completions.create(**create_kwargs)

            latency_ms = (time.time() - start_time) * 1000

            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            cost_usd = self.estimate_cost(input_tokens, output_tokens)

            return ModelOutput(
                raw_response=response.choices[0].message.content,
                tokens_used={"input": input_tokens, "output": output_tokens},
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                metadata={
                    "model": self.model_id,
                    "api": "chat_completions",
                    "finish_reason": response.choices[0].finish_reason,
                    "is_reasoning_model": self.is_reasoning_model,
                }
            )

        except Exception as e:
            raise RuntimeError(f"OpenAI Chat Completions API error: {str(e)}")

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        pricing = self.PRICING.get(self.model_id, {"input": 10.00, "output": 30.00})
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


class OpenAIResponsesClient(ModelClient):
    """Client for OpenAI Codex models via Responses API."""

    PRICING = OPENAI_PRICING

    def __init__(self, api_key: str, model_id: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model_id = model_id

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelOutput:
        start_time = time.time()

        try:
            # Responses API uses 'input' instead of 'messages'
            response = await self.client.responses.create(
                model=self.model_id,
                input=prompt,
                # Note: Responses API parameters differ from Chat Completions
                # temperature and max_tokens may not be supported the same way
            )

            latency_ms = (time.time() - start_time) * 1000

            # Responses API has different response structure
            input_tokens = response.usage.input_tokens if response.usage else 0
            output_tokens = response.usage.output_tokens if response.usage else 0
            cost_usd = self.estimate_cost(input_tokens, output_tokens)

            return ModelOutput(
                raw_response=response.output_text,
                tokens_used={"input": input_tokens, "output": output_tokens},
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                metadata={
                    "model": self.model_id,
                    "api": "responses",
                    "response_id": response.id if hasattr(response, 'id') else None,
                }
            )

        except Exception as e:
            raise RuntimeError(f"OpenAI Responses API error: {str(e)}")

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        pricing = self.PRICING.get(self.model_id, {"input": 3.00, "output": 12.00})
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


# Backward compatibility alias
OpenAIClient = OpenAICompletionsClient


class AnthropicClient(ModelClient):
    """Client for Anthropic Claude models."""

    PRICING = {
        # Claude 4.5 series
        "claude-opus-4-5-20250203": {"input": 15.00, "output": 75.00},
        "claude-sonnet-4-5-20250203": {"input": 3.00, "output": 15.00},
        # Claude 4 series
        "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
        # Claude 3.7 series
        "claude-3-7-sonnet-20250219": {"input": 3.00, "output": 15.00},
        # Claude 3.5 series
        "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
        "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
        # Claude 3 series
        "claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
        "claude-3-sonnet-20240229": {"input": 3.00, "output": 15.00},
        "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
    }

    def __init__(self, api_key: str, model_id: str):
        self.client = AsyncAnthropic(api_key=api_key)
        self.model_id = model_id

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelOutput:
        start_time = time.time()

        try:
            response = await self.client.messages.create(
                model=self.model_id,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}],
                **kwargs
            )

            latency_ms = (time.time() - start_time) * 1000

            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            cost_usd = self.estimate_cost(input_tokens, output_tokens)

            return ModelOutput(
                raw_response=response.content[0].text,
                tokens_used={"input": input_tokens, "output": output_tokens},
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                metadata={
                    "model": self.model_id,
                    "stop_reason": response.stop_reason,
                }
            )

        except Exception as e:
            raise RuntimeError(f"Anthropic API error: {str(e)}")

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        pricing = self.PRICING.get(self.model_id, {"input": 3.00, "output": 15.00})
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


class GoogleClient(ModelClient):
    """Client for Google Gemini models via OpenAI-compatible API."""

    PRICING = {
        # Gemini 3.0 series
        "gemini-3.0-ultra": {"input": 5.00, "output": 15.00},
        "gemini-3.0-pro": {"input": 1.50, "output": 5.00},
        # Gemini 2.5 series
        "gemini-2.5-pro": {"input": 1.25, "output": 5.00},
        "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
        # Gemini 2.0 series
        "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
        "gemini-2.0-flash-thinking": {"input": 0.10, "output": 0.40},
        # Gemini 1.5 series
        "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
        "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
        "gemini-1.5-flash-8b": {"input": 0.0375, "output": 0.15},
    }

    def __init__(self, api_key: str, model_id: str):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        self.model_id = model_id

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelOutput:
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=self.model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )

            latency_ms = (time.time() - start_time) * 1000

            input_tokens = response.usage.prompt_tokens if response.usage else 0
            output_tokens = response.usage.completion_tokens if response.usage else 0
            cost_usd = self.estimate_cost(input_tokens, output_tokens)

            return ModelOutput(
                raw_response=response.choices[0].message.content,
                tokens_used={"input": input_tokens, "output": output_tokens},
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                metadata={
                    "model": self.model_id,
                    "finish_reason": response.choices[0].finish_reason,
                }
            )

        except Exception as e:
            raise RuntimeError(f"Google API error: {str(e)}")

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        pricing = self.PRICING.get(self.model_id, {"input": 0.10, "output": 0.40})
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


class XAIClient(ModelClient):
    """Client for xAI Grok models via OpenAI-compatible API."""

    PRICING = {
        # Grok 3 series
        "grok-3": {"input": 3.00, "output": 15.00},
        "grok-3-mini": {"input": 0.50, "output": 2.00},
        # Grok 2 series
        "grok-2": {"input": 2.00, "output": 10.00},
        "grok-2-mini": {"input": 0.20, "output": 1.00},
        "grok-2-vision": {"input": 2.00, "output": 10.00},
    }

    def __init__(self, api_key: str, model_id: str):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.x.ai/v1"
        )
        self.model_id = model_id

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelOutput:
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=self.model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )

            latency_ms = (time.time() - start_time) * 1000

            input_tokens = response.usage.prompt_tokens if response.usage else 0
            output_tokens = response.usage.completion_tokens if response.usage else 0
            cost_usd = self.estimate_cost(input_tokens, output_tokens)

            return ModelOutput(
                raw_response=response.choices[0].message.content,
                tokens_used={"input": input_tokens, "output": output_tokens},
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                metadata={
                    "model": self.model_id,
                    "finish_reason": response.choices[0].finish_reason,
                }
            )

        except Exception as e:
            raise RuntimeError(f"xAI API error: {str(e)}")

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        pricing = self.PRICING.get(self.model_id, {"input": 2.00, "output": 10.00})
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


class DeepSeekClient(ModelClient):
    """Client for DeepSeek models via OpenAI-compatible API."""

    PRICING = {
        "deepseek-r2": {"input": 0.80, "output": 3.20},
        "deepseek-r1": {"input": 0.55, "output": 2.19},
        "deepseek-v3": {"input": 0.27, "output": 1.10},
        "deepseek-r1-distill-llama-70b": {"input": 0.14, "output": 0.55},
    }

    def __init__(self, api_key: str, model_id: str):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com/v1"
        )
        self.model_id = model_id

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelOutput:
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=self.model_id,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )

            latency_ms = (time.time() - start_time) * 1000

            input_tokens = response.usage.prompt_tokens if response.usage else 0
            output_tokens = response.usage.completion_tokens if response.usage else 0
            cost_usd = self.estimate_cost(input_tokens, output_tokens)

            return ModelOutput(
                raw_response=response.choices[0].message.content,
                tokens_used={"input": input_tokens, "output": output_tokens},
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                metadata={
                    "model": self.model_id,
                    "finish_reason": response.choices[0].finish_reason,
                }
            )

        except Exception as e:
            raise RuntimeError(f"DeepSeek API error: {str(e)}")

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        pricing = self.PRICING.get(self.model_id, {"input": 0.27, "output": 1.10})
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


class OpenRouterClient(ModelClient):
    """Client for accessing models via OpenRouter (Llama, Mistral, etc.)."""

    PRICING = {
        # Llama 4 series
        "llama-4-maverick-400b": {"input": 1.00, "output": 1.00},
        "llama-4-scout-100b": {"input": 0.50, "output": 0.50},
        # Llama 3.x series
        "llama-3.3-70b": {"input": 0.40, "output": 0.40},
        "llama-3.1-405b": {"input": 3.00, "output": 3.00},
        "llama-3.1-70b": {"input": 0.40, "output": 0.40},
        "llama-3.1-8b": {"input": 0.06, "output": 0.06},
        # Mistral models
        "mistral-large-2": {"input": 2.00, "output": 6.00},
        "mistral-medium": {"input": 2.70, "output": 8.10},
        "mistral-small": {"input": 0.20, "output": 0.60},
        "codestral": {"input": 0.30, "output": 0.90},
    }

    # Map simple names to OpenRouter model IDs
    MODEL_MAP = {
        # Llama 4
        "llama-4-maverick-400b": "meta-llama/llama-4-maverick-400b-instruct",
        "llama-4-scout-100b": "meta-llama/llama-4-scout-100b-instruct",
        # Llama 3.x
        "llama-3.3-70b": "meta-llama/llama-3.3-70b-instruct",
        "llama-3.1-405b": "meta-llama/llama-3.1-405b-instruct",
        "llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
        "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
        # Mistral
        "mistral-large-2": "mistralai/mistral-large-2407",
        "mistral-medium": "mistralai/mistral-medium",
        "mistral-small": "mistralai/mistral-small",
        "codestral": "mistralai/codestral-latest",
    }

    def __init__(self, api_key: str, model_id: str):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        self.model_id = model_id
        self.openrouter_model = self.MODEL_MAP.get(model_id, model_id)

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelOutput:
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=self.openrouter_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )

            latency_ms = (time.time() - start_time) * 1000

            input_tokens = response.usage.prompt_tokens if response.usage else 0
            output_tokens = response.usage.completion_tokens if response.usage else 0
            cost_usd = self.estimate_cost(input_tokens, output_tokens)

            return ModelOutput(
                raw_response=response.choices[0].message.content,
                tokens_used={"input": input_tokens, "output": output_tokens},
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                metadata={
                    "model": self.model_id,
                    "openrouter_model": self.openrouter_model,
                    "finish_reason": response.choices[0].finish_reason,
                }
            )

        except Exception as e:
            raise RuntimeError(f"OpenRouter API error: {str(e)}")

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        pricing = self.PRICING.get(self.model_id, {"input": 0.40, "output": 0.40})
        input_cost = (input_tokens / 1_000_000) * pricing["input"]
        output_cost = (output_tokens / 1_000_000) * pricing["output"]
        return input_cost + output_cost


class ModelClientFactory:
    """Factory for creating model clients."""

    # Models that require the Responses API (Codex subscription)
    RESPONSES_API_MODELS = {"codex-mini", "codex-mini-latest", "codex-5.2"}

    @staticmethod
    def create(model_id: str, api_keys: Dict[str, str]) -> ModelClient:
        """Create appropriate client based on model ID.
        
        API Keys:
            - 'openai': Standard OpenAI API key for Chat Completions API (GPT-5, o-series, etc.)
            - 'openai_codex': OAuth token for Responses API (Codex models)
            
        If only 'openai' is provided and a Codex model is requested, it will try to use
        that key (may fail if the key doesn't have access to Responses API).
        """
        
        # Codex models -> Responses API
        if model_id.startswith("codex-") or model_id in ModelClientFactory.RESPONSES_API_MODELS:
            # Prefer dedicated codex key, fall back to general openai key
            api_key = api_keys.get("openai_codex") or api_keys.get("openai")
            if not api_key:
                raise ValueError("OpenAI Codex API key not provided (set 'openai_codex' or 'openai' key)")
            return OpenAIResponsesClient(api_key, model_id)
        
        # GPT and o-series models -> Chat Completions API
        if model_id.startswith(("gpt-", "o1", "o3", "o4")):
            if "openai" not in api_keys or not api_keys["openai"]:
                raise ValueError("OpenAI API key not provided")
            return OpenAICompletionsClient(api_keys["openai"], model_id)
        
        # Anthropic models
        elif model_id.startswith("claude-"):
            if "anthropic" not in api_keys or not api_keys["anthropic"]:
                raise ValueError("Anthropic API key not provided")
            return AnthropicClient(api_keys["anthropic"], model_id)
        
        # Google models
        elif model_id.startswith("gemini-"):
            api_key = api_keys.get("google") or api_keys.get("gemini") or os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("Google API key not provided (set GOOGLE_API_KEY or pass 'google' key)")
            return GoogleClient(api_key, model_id)
        
        # xAI models
        elif model_id.startswith("grok-"):
            api_key = api_keys.get("xai") or api_keys.get("grok") or os.getenv("XAI_API_KEY")
            if not api_key:
                raise ValueError("xAI API key not provided (set XAI_API_KEY or pass 'xai' key)")
            return XAIClient(api_key, model_id)
        
        # DeepSeek models
        elif model_id.startswith("deepseek-"):
            api_key = api_keys.get("deepseek") or os.getenv("DEEPSEEK_API_KEY")
            if not api_key:
                raise ValueError("DeepSeek API key not provided (set DEEPSEEK_API_KEY or pass 'deepseek' key)")
            return DeepSeekClient(api_key, model_id)
        
        # Llama models (via OpenRouter)
        elif model_id.startswith("llama-"):
            api_key = api_keys.get("openrouter") or os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                raise ValueError("OpenRouter API key not provided (set OPENROUTER_API_KEY or pass 'openrouter' key)")
            return OpenRouterClient(api_key, model_id)
        
        # Mistral models (via OpenRouter)
        elif model_id.startswith(("mistral-", "codestral")):
            api_key = api_keys.get("openrouter") or api_keys.get("mistral") or os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                raise ValueError("OpenRouter/Mistral API key not provided (set OPENROUTER_API_KEY or pass 'openrouter' key)")
            return OpenRouterClient(api_key, model_id)
        
        else:
            raise ValueError(f"Unsupported model: {model_id}")


# Convenience function for quick testing
async def quick_test_model(model_id: str, prompt: str, api_keys: Dict[str, str]) -> ModelOutput:
    """Quick test function for development."""
    client = ModelClientFactory.create(model_id, api_keys)
    return await client.generate(prompt)
