# Patch for signals format conversion

def convert_signals(signals):
    """Convert signals from tuple format to dict format."""
    result = []
    for sig in signals:
        if isinstance(sig, dict):
            result.append(sig)
        elif isinstance(sig, (list, tuple)) and len(sig) >= 2:
            result.append({
                "type": sig[0],
                "risk_level": sig[1] if len(sig) > 1 else "medium",
                "evidence": sig[2] if len(sig) > 2 else ""
            })
    return result
