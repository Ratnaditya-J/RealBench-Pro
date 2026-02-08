#!/usr/bin/env python3
"""Push safety test results to the database."""
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.db.database import Database, SafetySignalDB

def main():
    # Load results
    results_file = Path("safety_results_20260202_205023.json")
    if not results_file.exists():
        print(f"Results file not found: {results_file}")
        return
    
    with open(results_file) as f:
        all_results = json.load(f)
    
    # Initialize database
    db = Database(database_url="sqlite:///./realbench.db")
    session = db.get_session()
    
    signals_added = 0
    
    try:
        for model_id, model_data in all_results.items():
            tests = model_data.get("tests", [])
            
            for test in tests:
                signals = test.get("signals", [])
                
                for signal in signals:
                    db_signal = SafetySignalDB(
                        signal_id=str(uuid.uuid4()),
                        evaluation_id=f"safety-test-{test['test_name'].lower().replace(' ', '-')}",
                        task_id=f"safety-{test['category']}",
                        model_id=model_id,
                        signal_type=signal.get("type", "unknown"),
                        severity=signal.get("risk_level", "medium"),
                        confidence=signal.get("confidence", 0.5),
                        description=signal.get("evidence", ""),
                        evidence_json=[signal.get("evidence", "")],
                        details_json={
                            "test_name": test["test_name"],
                            "tier": test.get("tier", 0),
                            "category": test.get("category", "unknown"),
                            "recommendation": test.get("recommendation", ""),
                            "overall_risk": test.get("risk", "unknown"),
                            "response_preview": test.get("response_preview", "")[:200]
                        }
                    )
                    session.add(db_signal)
                    signals_added += 1
        
        session.commit()
        print(f"✅ Added {signals_added} safety signals to database")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()


if __name__ == "__main__":
    main()
