"""Task management system - load, store, and manage evaluation tasks."""
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional

from app.models.schemas import Task, TaskDifficulty, TaskDomain

logger = logging.getLogger(__name__)


def sanitize_task_id(task_id: str) -> str:
    """
    Sanitize task ID to prevent path traversal attacks.

    Args:
        task_id: The task ID to sanitize

    Returns:
        Sanitized task ID safe for filesystem operations

    Raises:
        ValueError: If task ID contains invalid characters
    """
    # Only allow alphanumeric, hyphens, and underscores
    if not re.match(r'^[a-zA-Z0-9_-]+$', task_id):
        raise ValueError(
            f"Invalid task_id: '{task_id}'. "
            "Task IDs must contain only alphanumeric characters, hyphens, and underscores."
        )

    # Ensure no path traversal attempts
    if '..' in task_id or '/' in task_id or '\\' in task_id:
        raise ValueError(f"Invalid task_id: '{task_id}'. Path traversal detected.")

    return task_id


class TaskManager:
    """Manages loading and storing evaluation tasks."""

    def __init__(self, tasks_dir: str = "data/tasks"):
        self.tasks_dir = Path(tasks_dir)
        self.tasks_dir.mkdir(parents=True, exist_ok=True)
        self._tasks_cache: Dict[str, Task] = {}
        self._load_tasks()

    def _load_tasks(self):
        """Load all tasks from JSON files."""
        # Load seed tasks
        seed_file = self.tasks_dir / "seed_tasks.json"
        if seed_file.exists():
            with open(seed_file, "r") as f:
                tasks_data = json.load(f)
                for task_data in tasks_data:
                    task = Task(**task_data)
                    self._tasks_cache[task.task_id] = task

        # Load any other JSON files in the directory
        for json_file in self.tasks_dir.glob("*.json"):
            if json_file.name != "seed_tasks.json":
                with open(json_file, "r") as f:
                    try:
                        task_data = json.load(f)
                        # Handle both single task and array of tasks
                        if isinstance(task_data, list):
                            for td in task_data:
                                task = Task(**td)
                                self._tasks_cache[task.task_id] = task
                        else:
                            task = Task(**task_data)
                            self._tasks_cache[task.task_id] = task
                    except Exception as e:
                        logger.error(f"Error loading {json_file}: {e}")

    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID."""
        return self._tasks_cache.get(task_id)

    def list_tasks(
        self,
        domain: Optional[TaskDomain] = None,
        difficulty: Optional[TaskDifficulty] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Task]:
        """List tasks with optional filtering."""
        tasks = list(self._tasks_cache.values())

        # Apply filters
        if domain:
            tasks = [t for t in tasks if t.domain == domain]
        if difficulty:
            tasks = [t for t in tasks if t.difficulty == difficulty]

        # Sort by creation date (newest first)
        tasks.sort(key=lambda t: t.created_at, reverse=True)

        # Apply pagination
        return tasks[offset:offset + limit]

    def add_task(self, task: Task) -> Task:
        """Add a new task."""
        # Sanitize task ID to prevent path traversal
        safe_task_id = sanitize_task_id(task.task_id)

        # Add to cache
        self._tasks_cache[task.task_id] = task

        # Save to file with sanitized ID
        task_file = self.tasks_dir / f"{safe_task_id}.json"
        # Additional safety: ensure the resolved path is within tasks_dir
        if not task_file.resolve().is_relative_to(self.tasks_dir.resolve()):
            raise ValueError(f"Invalid task file path: {task_file}")

        with open(task_file, "w") as f:
            json.dump(task.model_dump(), f, indent=2, default=str)

        return task

    def get_all_tasks(self) -> List[Task]:
        """Get all tasks."""
        return list(self._tasks_cache.values())

    def count_tasks(
        self,
        domain: Optional[TaskDomain] = None,
        difficulty: Optional[TaskDifficulty] = None
    ) -> int:
        """Count tasks with optional filtering."""
        tasks = self.list_tasks(domain=domain, difficulty=difficulty, limit=999999)
        return len(tasks)

    def delete_task(self, task_id: str) -> bool:
        """Delete a task."""
        # Sanitize task ID to prevent path traversal
        safe_task_id = sanitize_task_id(task_id)

        if task_id in self._tasks_cache:
            del self._tasks_cache[task_id]
            task_file = self.tasks_dir / f"{safe_task_id}.json"
            # Additional safety: ensure the resolved path is within tasks_dir
            if task_file.resolve().is_relative_to(self.tasks_dir.resolve()) and task_file.exists():
                task_file.unlink()
            return True
        return False

    def reload_tasks(self):
        """Reload tasks from disk."""
        self._tasks_cache.clear()
        self._load_tasks()
