from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class EmployeeBase(BaseModel):
    name: str = Field(..., example="Aayush Sharma")
    department: str = Field(..., example="AI Engineering")

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeResponse(EmployeeBase):
    id: str
    attendance_status: str = "Absent"
    confidence: float = 0.0
    last_seen: Optional[str] = None
    photo_url: Optional[str] = None

class SettingToggle(BaseModel):
    yolo_enabled: bool = True
    face_enabled: bool = True
    pose_enabled: bool = True
    activity_enabled: bool = True
    alert_sensitivity: float = 0.5 # 0.0 to 1.0
    active_camera_id: int = 0

class ActivityLogEntry(BaseModel):
    timestamp: str
    employee_name: str
    department: str
    activity: str
    confidence: float
    status: str # "Present", "Absent", "On Break", "Inactive"

class AlertEntry(BaseModel):
    id: str
    timestamp: str
    type: str # "Unauthorized", "Sleeping", "Prolonged Inactivity", "Restricted Access"
    details: str
    severity: str # "Low", "Medium", "High", "Critical"
    resolved: bool = False
