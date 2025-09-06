"""
High School Management System API

import enum

class UserRole(enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"
A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""


from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path

from sqlalchemy import Column, Integer, String, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///./activities.db"
Base = declarative_base()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from sqlalchemy import Enum, Boolean
# Attendance: Mark attendance for a student in an activity
import enum

class UserRole(enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    grade = Column(String)
    role = Column(Enum(UserRole), default=UserRole.student)
    participants = relationship("Participant", back_populates="student")

class Activity(Base):
# Attendance: Get attendance history for a student
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    schedule = Column(String)
    capacity = Column(Integer)
    participants = relationship("Participant", back_populates="activity")
class Waitlist(Base):
    __tablename__ = "waitlist"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    activity_id = Column(Integer, ForeignKey("activities.id"))

class Attendance(Base):
    __tablename__ = "attendance"
# Notifications: Send notification to a student
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    activity_id = Column(Integer, ForeignKey("activities.id"))
    date = Column(String)
    present = Column(Boolean, default=False)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    message = Column(String)
    sent = Column(Boolean, default=False)

class Participant(Base):
    __tablename__ = "participants"
    id = Column(Integer, primary_key=True, index=True)
# Notifications: Get notifications for a student
    email = Column(String, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"))
    activity = relationship("Activity", back_populates="participants")
    student_id = Column(Integer, ForeignKey("students.id"))
    student = relationship("Student", back_populates="participants")

def init_db():
    Base.metadata.create_all(bind=engine)
    # Seed initial activities: always ensure all required activities are present
    # This logic checks for each activity and adds it if missing, making seeding idempotent and robust
    db = SessionLocal()
    initial_activities = [
        {"name": "Chess Club", "description": "Learn strategies and compete in chess tournaments", "schedule": "Fridays, 3:30 PM - 5:00 PM", "capacity": 12},
        {"name": "Programming Class", "description": "Learn programming fundamentals and build software projects", "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM", "capacity": 20},
        {"name": "Gym Class", "description": "Physical education and sports activities", "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM", "capacity": 30},
        {"name": "Soccer Team", "description": "Join the school soccer team and compete in matches", "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM", "capacity": 22},
        {"name": "Basketball Team", "description": "Practice and play basketball with the school team", "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM", "capacity": 15},
        {"name": "Art Club", "description": "Explore your creativity through painting and drawing", "schedule": "Thursdays, 3:30 PM - 5:00 PM", "capacity": 15},
        {"name": "Drama Club", "description": "Act, direct, and produce plays and performances", "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM", "capacity": 20},
        {"name": "Math Club", "description": "Solve challenging problems and participate in math competitions", "schedule": "Tuesdays, 3:30 PM - 4:30 PM", "capacity": 10},
        {"name": "Debate Team", "description": "Develop public speaking and argumentation skills", "schedule": "Fridays, 4:00 PM - 5:30 PM", "capacity": 12},
    # Added 'GitHub Skills' to ensure it is always available for registration and UI display
    {"name": "GitHub Skills", "description": "Learn practical coding and collaboration skills with GitHub. First part of the GitHub Certifications program.", "schedule": "Thursdays, 4:00 PM - 5:00 PM", "capacity": 25}
    ]
    for act in initial_activities:
        # Only add the activity if it does not already exist in the database
        if not db.query(Activity).filter(Activity.name == act["name"]).first():
            db.add(Activity(**act))
    db.commit()
    db.close()

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

def get_user_role(email: str):
    db = SessionLocal()
    student = db.query(Student).filter(Student.email == email).first()
    db.close()
    if not student:
        return None
    return student.role.value

init_db()

@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

# Dashboard endpoint
@app.get("/dashboard")
def get_dashboard():
    db = SessionLocal()
    activities = db.query(Activity).all()
    total_activities = len(activities)
    total_participants = sum(len(a.participants) for a in activities)
    activity_stats = [
        {
            "name": a.name,
            "participants": len(a.participants),
            "spots_left": a.capacity - len(a.participants)
        }
        for a in activities
    ]
    db.close()
    return {
        "total_activities": total_activities,
        "total_participants": total_participants,
        "activity_stats": activity_stats
    }
@app.get("/activities")
def get_activities():
    db = SessionLocal()
    activities = db.query(Activity).all()
    result = {}
    for activity in activities:
        result[activity.name] = {
            "description": activity.description,
            "schedule": activity.schedule,
            "max_participants": activity.capacity,
            "participants": [
                {
                    "email": p.email,
                    "name": p.student.name if p.student else None,
                    "grade": p.student.grade if p.student else None
                }
                for p in activity.participants
            ]
        }
    db.close()
    return result


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, name: str = None, grade: str = None):
    db = SessionLocal()
    activity = db.query(Activity).filter(Activity.name == activity_name).first()
    if not activity:
        db.close()
        raise HTTPException(status_code=404, detail="Activity not found")
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        if not name or not grade:
            db.close()
            raise HTTPException(status_code=400, detail="Student profile required (name, grade)")
        student = Student(email=email, name=name, grade=grade)
        db.add(student)
        db.commit()
        db.refresh(student)
    # Check if already signed up
    if any(p.student_id == student.id for p in activity.participants):
        db.close()
        raise HTTPException(status_code=400, detail="Student is already signed up")
    # Check if already on waitlist
    if db.query(Waitlist).filter(Waitlist.activity_id == activity.id, Waitlist.student_id == student.id).first():
        db.close()
        raise HTTPException(status_code=400, detail="Student is already on the waitlist")
    # If activity is full, add to waitlist
    if len(activity.participants) >= activity.capacity:
        waitlist_entry = Waitlist(student_id=student.id, activity_id=activity.id)
        db.add(waitlist_entry)
        db.commit()
        db.close()
        return {"message": f"Activity full. {email} added to waitlist for {activity_name}"}
    # Otherwise, add as participant
    participant = Participant(email=email, activity=activity, student=student)
    db.add(participant)
    db.commit()
    db.refresh(activity)
    db.close()
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str):
    db = SessionLocal()
    activity = db.query(Activity).filter(Activity.name == activity_name).first()
    if not activity:
        db.close()
        raise HTTPException(status_code=404, detail="Activity not found")
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        db.close()
        raise HTTPException(status_code=404, detail="Student not found")
    participant = db.query(Participant).filter(Participant.activity_id == activity.id, Participant.student_id == student.id).first()
    if not participant:
        db.close()
        raise HTTPException(status_code=400, detail="Student is not signed up for this activity")
    db.delete(participant)
    db.commit()
    db.refresh(activity)
    # Promote first student from waitlist if exists
    waitlist_entry = db.query(Waitlist).filter(Waitlist.activity_id == activity.id).order_by(Waitlist.id.asc()).first()
    if waitlist_entry:
        promoted_student = db.query(Student).filter(Student.id == waitlist_entry.student_id).first()
        if promoted_student:
            new_participant = Participant(email=promoted_student.email, activity=activity, student=promoted_student)
            db.add(new_participant)
            db.delete(waitlist_entry)
            db.commit()
    db.close()
    return {"message": f"Unregistered {email} from {activity_name}"}
# Endpoint: Get waitlist for an activity
@app.get("/activities/{activity_name}/waitlist")
def get_activity_waitlist(activity_name: str):
    db = SessionLocal()
    activity = db.query(Activity).filter(Activity.name == activity_name).first()
    if not activity:
        db.close()
        raise HTTPException(status_code=404, detail="Activity not found")
    waitlist_entries = db.query(Waitlist).filter(Waitlist.activity_id == activity.id).all()
    result = []
    for entry in waitlist_entries:
        student = db.query(Student).filter(Student.id == entry.student_id).first()
        if student:
            result.append({"email": student.email, "name": student.name, "grade": student.grade})
    db.close()
    return result

# Endpoint: Remove student from waitlist
@app.delete("/activities/{activity_name}/waitlist/remove")
def remove_from_waitlist(activity_name: str, email: str, user_email: str):
    role = get_user_role(user_email)
    if role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    db = SessionLocal()
    activity = db.query(Activity).filter(Activity.name == activity_name).first()
    student = db.query(Student).filter(Student.email == email).first()
    if not activity or not student:
        db.close()
        raise HTTPException(status_code=404, detail="Activity or student not found")
    waitlist_entry = db.query(Waitlist).filter(Waitlist.activity_id == activity.id, Waitlist.student_id == student.id).first()
    if not waitlist_entry:
        db.close()
        raise HTTPException(status_code=400, detail="Student is not on the waitlist")
    db.delete(waitlist_entry)
    db.commit()
    db.close()
    return {"message": f"Removed {email} from waitlist for {activity_name}"}
# Student profile endpoints
@app.get("/students/{email}")
def get_student_profile(email: str):
    db = SessionLocal()
    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        db.close()
        raise HTTPException(status_code=404, detail="Student not found")
    activities = [
        {
            "name": p.activity.name,
            "description": p.activity.description,
            "schedule": p.activity.schedule
        }
        for p in student.participants if p.activity is not None
    ]
    profile = {
        "email": student.email,
        "name": student.name,
        "grade": student.grade,
        "activities": activities
    }
    db.close()
    return profile

@app.post("/students")
def create_or_update_student(email: str, name: str, grade: str):
    db = SessionLocal()
    student = db.query(Student).filter(Student.email == email).first()
    if student:
        student.name = name
        student.grade = grade
    else:
        student = Student(email=email, name=name, grade=grade)
        db.add(student)
    db.commit()
    db.refresh(student)
    db.close()
    return {"message": "Student profile saved", "profile": {"email": student.email, "name": student.name, "grade": student.grade}}
