"""Database setup and models using SQLAlchemy."""
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy import Column, Float, Integer, String, Text, DateTime, create_engine, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


class EvaluationResultDB(Base):
    """Database model for evaluation results."""
    __tablename__ = "evaluation_results"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(String, unique=True, index=True)
    task_id = Column(String, index=True)
    model_id = Column(String, index=True)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Model output
    raw_response = Column(Text)
    tokens_input = Column(Integer)
    tokens_output = Column(Integer)
    latency_ms = Column(Float)
    cost_usd = Column(Float)

    # Scores (stored as JSON)
    scores_json = Column(JSON)  # List of {dimension, score, reasoning, confidence}
    overall_score = Column(Float, index=True)
    contamination_score = Column(Float, nullable=True)

    # Metadata
    metadata_json = Column(JSON)

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "evaluation_id": self.evaluation_id,
            "task_id": self.task_id,
            "model_id": self.model_id,
            "executed_at": self.executed_at.isoformat(),
            "raw_response": self.raw_response,
            "tokens_used": {"input": self.tokens_input, "output": self.tokens_output},
            "latency_ms": self.latency_ms,
            "cost_usd": self.cost_usd,
            "scores": self.scores_json,
            "overall_score": self.overall_score,
            "contamination_score": self.contamination_score,
            "metadata": self.metadata_json,
        }


class ContaminationReportDB(Base):
    """Database model for contamination reports."""
    __tablename__ = "contamination_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String, unique=True, index=True)
    task_id = Column(String, index=True)
    model_id = Column(String, index=True)
    checked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    is_contaminated = Column(Boolean)  # SQLite supports Boolean
    confidence = Column(Float)
    signals_json = Column(JSON)
    recommendation = Column(String)
    evidence = Column(Text)

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "report_id": self.report_id,
            "task_id": self.task_id,
            "model_id": self.model_id,
            "checked_at": self.checked_at.isoformat(),
            "is_contaminated": bool(self.is_contaminated),
            "confidence": self.confidence,
            "signals": self.signals_json,
            "recommendation": self.recommendation,
            "evidence": self.evidence,
        }


class SafetySignalDB(Base):
    """Database model for safety signals."""
    __tablename__ = "safety_signals"

    id = Column(Integer, primary_key=True, index=True)
    signal_id = Column(String, unique=True, index=True)
    evaluation_id = Column(String, index=True)
    task_id = Column(String, index=True)
    model_id = Column(String, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    signal_type = Column(String, index=True)
    severity = Column(String, index=True)  # none, low, medium, high, critical
    confidence = Column(Float)
    description = Column(Text)
    evidence_json = Column(JSON)  # List of evidence strings
    details_json = Column(JSON)

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "signal_id": self.signal_id,
            "evaluation_id": self.evaluation_id,
            "task_id": self.task_id,
            "model_id": self.model_id,
            "created_at": self.created_at.isoformat(),
            "signal_type": self.signal_type,
            "severity": self.severity,
            "confidence": self.confidence,
            "description": self.description,
            "evidence": self.evidence_json or [],
            "details": self.details_json or {},
        }


class EvaluationStatusDB(Base):
    """Database model for tracking evaluation status."""
    __tablename__ = "evaluation_status"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(String, unique=True, index=True)
    task_id = Column(String, index=True)
    models_json = Column(JSON)  # List of model IDs
    status = Column(String, index=True)  # pending, running, completed, failed
    progress = Column(Integer, default=0)
    completed = Column(Integer, default=0)
    total = Column(Integer)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "evaluation_id": self.evaluation_id,
            "task_id": self.task_id,
            "models": self.models_json or [],
            "status": self.status,
            "progress": self.progress,
            "completed": self.completed,
            "total": self.total,
            "error": self.error,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class EnsembleReportDB(Base):
    """Database model for ensemble safety reports."""
    __tablename__ = "ensemble_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String, unique=True, index=True)
    evaluation_id = Column(String, index=True, nullable=True)
    task_id = Column(String, index=True)
    model_id = Column(String, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Ensemble decision
    ensemble_risk = Column(String, index=True)  # none, low, medium, high, critical
    ensemble_confidence = Column(Float)
    is_safe = Column(Boolean)
    judge_agreement = Column(Float)
    unanimous = Column(Boolean)

    # Results
    recommendation = Column(String)
    summary = Column(Text)
    mitigation_steps_json = Column(JSON)

    # Cost tracking
    total_cost_usd = Column(Float)
    total_latency_ms = Column(Float)

    # Probe results (if any)
    probe_results_json = Column(JSON, nullable=True)

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "report_id": self.report_id,
            "evaluation_id": self.evaluation_id,
            "task_id": self.task_id,
            "model_id": self.model_id,
            "created_at": self.created_at.isoformat(),
            "ensemble_risk": self.ensemble_risk,
            "ensemble_confidence": self.ensemble_confidence,
            "is_safe": self.is_safe,
            "judge_agreement": self.judge_agreement,
            "unanimous": self.unanimous,
            "recommendation": self.recommendation,
            "summary": self.summary,
            "mitigation_steps": self.mitigation_steps_json or [],
            "total_cost_usd": self.total_cost_usd,
            "total_latency_ms": self.total_latency_ms,
            "probe_results": self.probe_results_json or [],
        }


class JudgeVerdictDB(Base):
    """Database model for individual judge verdicts."""
    __tablename__ = "judge_verdicts"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String, index=True)  # Links to EnsembleReportDB
    judge_type = Column(String, index=True)  # safety, behavioral, adversarial
    model_id = Column(String)
    risk_level = Column(String)
    confidence = Column(Float)
    reasoning = Column(Text)
    evidence_json = Column(JSON)
    detected_signals_json = Column(JSON)
    latency_ms = Column(Float)
    cost_usd = Column(Float)

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "report_id": self.report_id,
            "judge_type": self.judge_type,
            "model_id": self.model_id,
            "risk_level": self.risk_level,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "evidence": self.evidence_json or [],
            "detected_signals": self.detected_signals_json or [],
            "latency_ms": self.latency_ms,
            "cost_usd": self.cost_usd,
        }


class Database:
    """Database manager."""

    def __init__(self, database_url: str = "sqlite:///./realbench.db"):
        self.engine = create_engine(database_url, connect_args={"check_same_thread": False})
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

    def get_session(self):
        """Get database session."""
        return self.SessionLocal()

    def save_evaluation(self, evaluation_result) -> None:
        """Save evaluation result to database with transaction support."""
        session = self.get_session()
        try:
            db_result = EvaluationResultDB(
                evaluation_id=evaluation_result.evaluation_id,
                task_id=evaluation_result.task_id,
                model_id=evaluation_result.model_id,
                executed_at=evaluation_result.executed_at,
                raw_response=evaluation_result.model_output.raw_response,
                tokens_input=evaluation_result.model_output.tokens_used.get("input", 0),
                tokens_output=evaluation_result.model_output.tokens_used.get("output", 0),
                latency_ms=evaluation_result.model_output.latency_ms,
                cost_usd=evaluation_result.model_output.cost_usd,
                scores_json=[s.model_dump() for s in evaluation_result.scores],
                overall_score=evaluation_result.overall_score,
                contamination_score=evaluation_result.contamination_score,
                metadata_json=evaluation_result.metadata,
            )
            session.add(db_result)
            session.commit()
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    def get_evaluation(self, evaluation_id: str) -> Optional[Dict]:
        """Get evaluation by ID."""
        session = self.get_session()
        try:
            result = session.query(EvaluationResultDB).filter(
                EvaluationResultDB.evaluation_id == evaluation_id
            ).first()
            return result.to_dict() if result else None
        finally:
            session.close()

    def get_leaderboard(self, limit: int = 50) -> List[Dict]:
        """Get leaderboard data."""
        session = self.get_session()
        try:
            from sqlalchemy import func

            # Aggregate by model_id
            results = session.query(
                EvaluationResultDB.model_id,
                func.avg(EvaluationResultDB.overall_score).label("avg_score"),
                func.count(EvaluationResultDB.id).label("count"),
                func.avg(EvaluationResultDB.cost_usd).label("avg_cost"),
                func.avg(EvaluationResultDB.latency_ms).label("avg_latency"),
                func.max(EvaluationResultDB.executed_at).label("last_updated"),
            ).group_by(
                EvaluationResultDB.model_id
            ).order_by(
                func.avg(EvaluationResultDB.overall_score).desc()
            ).limit(limit).all()

            leaderboard = []
            for r in results:
                # Get dimension scores for this model
                scores_by_dimension = self._get_dimension_scores(session, r.model_id)
                
                # Get safety flags count
                safety_flags = self._get_safety_flags_count(session, r.model_id)
                
                # Get contamination flags count
                contamination_flags = self._get_contamination_flags_count(session, r.model_id)
                
                leaderboard.append({
                    "model_id": r.model_id,
                    "display_name": r.model_id,  # TODO: Add model registry
                    "overall_score": round(r.avg_score, 3) if r.avg_score else 0.0,
                    "num_evaluations": r.count,
                    "scores_by_dimension": scores_by_dimension,
                    "avg_cost_usd": round(r.avg_cost, 4) if r.avg_cost else 0.0,
                    "avg_latency_ms": round(r.avg_latency, 1) if r.avg_latency else 0.0,
                    "last_updated": r.last_updated.isoformat() if r.last_updated else None,
                    "safety_flags": safety_flags,
                    "contamination_flags": contamination_flags,
                })

            return leaderboard
        finally:
            session.close()
    
    def _get_safety_flags_count(self, session, model_id: str) -> int:
        """Get count of safety signals for a model (high/critical only)."""
        from sqlalchemy import func
        count = session.query(func.count(SafetySignalDB.id)).filter(
            SafetySignalDB.model_id == model_id,
            SafetySignalDB.severity.in_(['high', 'critical'])
        ).scalar()
        return count or 0
    
    def _get_contamination_flags_count(self, session, model_id: str) -> int:
        """Get count of contamination flags for a model."""
        from sqlalchemy import func
        count = session.query(func.count(ContaminationReportDB.id)).filter(
            ContaminationReportDB.model_id == model_id,
            ContaminationReportDB.is_contaminated == True
        ).scalar()
        return count or 0

    def _get_dimension_scores(self, session, model_id: str) -> Dict[str, float]:
        """
        Get average scores by dimension for a model.
        Optimized to select only scores_json column instead of loading all columns.
        """
        # Only select scores_json column to reduce memory usage
        scores_query = session.query(EvaluationResultDB.scores_json).filter(
            EvaluationResultDB.model_id == model_id
        ).all()

        if not scores_query:
            return {}

        # Aggregate scores by dimension
        dimension_totals: Dict[str, List[float]] = {}
        for (scores_json,) in scores_query:
            if scores_json:
                for score_data in scores_json:
                    dim = score_data.get("dimension", "unknown")
                    score = score_data.get("score", 0.0)
                    if dim not in dimension_totals:
                        dimension_totals[dim] = []
                    dimension_totals[dim].append(score)

        # Calculate averages
        return {
            dim: round(sum(scores) / len(scores), 3)
            for dim, scores in dimension_totals.items()
            if scores
        }

    def save_contamination_report(self, report) -> None:
        """Save contamination report to database with transaction support."""
        session = self.get_session()
        try:
            db_report = ContaminationReportDB(
                report_id=report.report_id,
                task_id=report.task_id,
                model_id=report.model_id,
                checked_at=report.checked_at,
                is_contaminated=report.is_contaminated,
                confidence=report.confidence,
                signals_json=[s.model_dump() for s in report.signals],
                recommendation=report.recommendation,
                evidence=report.evidence,
            )
            session.add(db_report)
            session.commit()
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    def save_safety_signal(self, signal_data: Dict) -> None:
        """Save a safety signal to database with transaction support."""
        import uuid
        session = self.get_session()
        try:
            db_signal = SafetySignalDB(
                signal_id=signal_data.get("signal_id", str(uuid.uuid4())),
                evaluation_id=signal_data.get("evaluation_id"),
                task_id=signal_data.get("task_id"),
                model_id=signal_data.get("model_id"),
                signal_type=signal_data.get("signal_type"),
                severity=signal_data.get("severity", "medium"),
                confidence=signal_data.get("confidence", 0.5),
                description=signal_data.get("description", ""),
                evidence_json=signal_data.get("evidence", []),
                details_json=signal_data.get("details", {}),
            )
            session.add(db_signal)
            session.commit()
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    def get_safety_signals(
        self,
        model_id: Optional[str] = None,
        severity: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get safety signals with optional filtering."""
        session = self.get_session()
        try:
            query = session.query(SafetySignalDB)
            
            if model_id:
                query = query.filter(SafetySignalDB.model_id == model_id)
            if severity:
                query = query.filter(SafetySignalDB.severity == severity)
            
            query = query.order_by(SafetySignalDB.created_at.desc()).limit(limit)
            
            return [signal.to_dict() for signal in query.all()]
        finally:
            session.close()

    def get_evaluations(
        self,
        task_id: Optional[str] = None,
        model_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict]:
        """Get evaluations with optional filtering."""
        session = self.get_session()
        try:
            query = session.query(EvaluationResultDB)
            
            if task_id:
                query = query.filter(EvaluationResultDB.task_id == task_id)
            if model_id:
                query = query.filter(EvaluationResultDB.model_id == model_id)
            
            query = query.order_by(EvaluationResultDB.executed_at.desc())
            query = query.offset(offset).limit(limit)
            
            return [ev.to_dict() for ev in query.all()]
        finally:
            session.close()

    def count_evaluations(
        self,
        task_id: Optional[str] = None,
        model_id: Optional[str] = None
    ) -> int:
        """Count evaluations with optional filtering."""
        from sqlalchemy import func
        session = self.get_session()
        try:
            query = session.query(func.count(EvaluationResultDB.id))

            if task_id:
                query = query.filter(EvaluationResultDB.task_id == task_id)
            if model_id:
                query = query.filter(EvaluationResultDB.model_id == model_id)

            return query.scalar() or 0
        finally:
            session.close()

    # Evaluation Status Management (replaces global mutable state)
    def create_evaluation_status(
        self,
        evaluation_id: str,
        task_id: str,
        model_ids: List[str]
    ) -> None:
        """Create a new evaluation status record with transaction support."""
        session = self.get_session()
        try:
            status = EvaluationStatusDB(
                evaluation_id=evaluation_id,
                task_id=task_id,
                models_json=model_ids,
                status="pending",
                total=len(model_ids),
                progress=0,
                completed=0
            )
            session.add(status)
            session.commit()
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    def update_evaluation_status(
        self,
        evaluation_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        completed: Optional[int] = None,
        error: Optional[str] = None
    ) -> None:
        """Update evaluation status with transaction support."""
        session = self.get_session()
        try:
            db_status = session.query(EvaluationStatusDB).filter(
                EvaluationStatusDB.evaluation_id == evaluation_id
            ).first()

            if db_status:
                if status:
                    db_status.status = status
                if progress is not None:
                    db_status.progress = progress
                if completed is not None:
                    db_status.completed = completed
                if error is not None:
                    db_status.error = error
                if status in ("completed", "failed"):
                    db_status.completed_at = datetime.now(timezone.utc)

                session.commit()
        except Exception as e:
            session.rollback()
            raise
        finally:
            session.close()

    def get_evaluation_status(self, evaluation_id: str) -> Optional[Dict]:
        """Get evaluation status."""
        session = self.get_session()
        try:
            db_status = session.query(EvaluationStatusDB).filter(
                EvaluationStatusDB.evaluation_id == evaluation_id
            ).first()

            return db_status.to_dict() if db_status else None
        finally:
            session.close()

    def delete_old_evaluation_statuses(self, days: int = 7) -> int:
        """Delete evaluation statuses older than specified days."""
        from datetime import timedelta
        session = self.get_session()
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            deleted = session.query(EvaluationStatusDB).filter(
                EvaluationStatusDB.started_at < cutoff,
                EvaluationStatusDB.status.in_(["completed", "failed"])
            ).delete()
            session.commit()
            return deleted
        finally:
            session.close()

    # ========== Ensemble Safety Report Methods ==========

    def save_ensemble_report(self, report) -> None:
        """Save ensemble safety report to database."""
        session = self.get_session()
        try:
            # Save main report
            db_report = EnsembleReportDB(
                report_id=report.report_id,
                evaluation_id=report.evaluation_id if hasattr(report, 'evaluation_id') else None,
                task_id=report.task_id,
                model_id=report.model_id,
                ensemble_risk=report.ensemble_risk.value,
                ensemble_confidence=report.ensemble_confidence,
                is_safe=report.is_safe,
                judge_agreement=report.judge_agreement,
                unanimous=report.unanimous,
                recommendation=report.recommendation,
                summary=report.summary,
                mitigation_steps_json=report.mitigation_steps,
                total_cost_usd=report.total_cost_usd,
                total_latency_ms=report.total_latency_ms,
                probe_results_json=[p.model_dump() for p in report.probe_results] if report.probe_results else None
            )
            session.add(db_report)

            # Save judge verdicts
            for verdict in report.judge_verdicts:
                db_verdict = JudgeVerdictDB(
                    report_id=report.report_id,
                    judge_type=verdict.judge_type.value,
                    model_id=verdict.model_id,
                    risk_level=verdict.risk_level.value,
                    confidence=verdict.confidence,
                    reasoning=verdict.reasoning,
                    evidence_json=verdict.evidence,
                    detected_signals_json=[s.value for s in verdict.detected_signals],
                    latency_ms=verdict.latency_ms,
                    cost_usd=verdict.cost_usd
                )
                session.add(db_verdict)

            session.commit()
        except Exception as e:
            session.rollback()
            import logging
            logging.error(f"Failed to save ensemble report: {e}")
            raise
        finally:
            session.close()

    def get_ensemble_report(self, report_id: str) -> Optional[Dict]:
        """Get ensemble report by ID."""
        session = self.get_session()
        try:
            db_report = session.query(EnsembleReportDB).filter(
                EnsembleReportDB.report_id == report_id
            ).first()

            if not db_report:
                return None

            # Get judge verdicts
            verdicts = session.query(JudgeVerdictDB).filter(
                JudgeVerdictDB.report_id == report_id
            ).all()

            result = db_report.to_dict()
            result["judge_verdicts"] = [v.to_dict() for v in verdicts]
            return result
        finally:
            session.close()

    def get_ensemble_reports(
        self,
        task_id: Optional[str] = None,
        model_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict]:
        """Get ensemble reports with optional filtering."""
        session = self.get_session()
        try:
            query = session.query(EnsembleReportDB)

            if task_id:
                query = query.filter(EnsembleReportDB.task_id == task_id)
            if model_id:
                query = query.filter(EnsembleReportDB.model_id == model_id)

            query = query.order_by(EnsembleReportDB.created_at.desc())
            query = query.offset(offset).limit(limit)

            reports = []
            for report in query.all():
                # Get verdicts for each report
                verdicts = session.query(JudgeVerdictDB).filter(
                    JudgeVerdictDB.report_id == report.report_id
                ).all()

                report_dict = report.to_dict()
                report_dict["judge_verdicts"] = [v.to_dict() for v in verdicts]
                reports.append(report_dict)

            return reports
        finally:
            session.close()

    def get_latest_ensemble_report_for_evaluation(self, evaluation_id: str) -> Optional[Dict]:
        """Get the latest ensemble report for a specific evaluation."""
        session = self.get_session()
        try:
            db_report = session.query(EnsembleReportDB).filter(
                EnsembleReportDB.evaluation_id == evaluation_id
            ).order_by(EnsembleReportDB.created_at.desc()).first()

            if not db_report:
                return None

            # Get judge verdicts
            verdicts = session.query(JudgeVerdictDB).filter(
                JudgeVerdictDB.report_id == db_report.report_id
            ).all()

            result = db_report.to_dict()
            result["judge_verdicts"] = [v.to_dict() for v in verdicts]
            return result
        finally:
            session.close()
