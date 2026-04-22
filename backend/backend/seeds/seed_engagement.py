"""
The Nest — Player Engagement Seed Script

Populates the `player_engagement` Cloud SQL table with realistic placeholder
data for all 44 Hawthorn FC players, based on the AFL Player Engagement 2026
spreadsheet format.

Usage:
    python seeds/seed_engagement.py
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.engagement import PlayerEngagement
from db.cloudsql_client import Base

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/hfc_dev"
)

# ── Placeholder Engagement Data ────────────────────────────────────────────────
# Fields: jumper_no, listing, dob, state, has_children, program,
#         area_of_schooling, education_study, university,
#         study_monday, study_wednesday, study_thursday,
#         certificate_1, certificate_2,
#         body_load_tier, body_goal, community_engaged, engagement_notes

ENGAGEMENT_DATA = [
    {
        "jumper_no": 1, "listing": "List", "dob": "2000-03-15", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Inner City Melbourne", "education_study": "Bachelor of Commerce",
        "university": "University of Melbourne", "study_monday": True, "study_wednesday": False,
        "study_thursday": True, "certificate_1": "Cert III in Business", "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Maintain lean mass",
        "community_engaged": True, "engagement_notes": "Active in HFC school visits program"
    },
    {
        "jumper_no": 2, "listing": "Father-Son", "dob": "2000-01-22", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Eastern Suburbs Melbourne", "education_study": "Bachelor of Exercise Science",
        "university": "Victoria University", "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert III in Fitness", "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Build upper body strength",
        "community_engaged": True, "engagement_notes": "Mentors youth players in Vic Country program"
    },
    {
        "jumper_no": 3, "listing": "Draft", "dob": "2003-07-04", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Northern Suburbs", "education_study": "Bachelor of Business",
        "university": "RMIT University", "study_monday": True, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert IV in Leadership", "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Gain lean muscle mass",
        "community_engaged": True, "engagement_notes": "Brownlow candidate — high media engagement"
    },
    {
        "jumper_no": 4, "listing": "List", "dob": "1996-09-17", "state": "WA",
        "has_children": True, "program": "AFL SportsReady",
        "area_of_schooling": "Perth Suburbs", "education_study": "Certificate in Sports Management",
        "university": None, "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert III in Sport & Recreation", "certificate_2": "Cert IV in Management",
        "body_load_tier": 3, "body_goal": "Maintain match fitness",
        "community_engaged": True, "engagement_notes": "Long-serving club leader, involved in HFC foundation"
    },
    {
        "jumper_no": 5, "listing": "List", "dob": "2000-04-09", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Gippsland Region", "education_study": "Bachelor of Sports Science",
        "university": "Deakin University", "study_monday": True, "study_wednesday": False,
        "study_thursday": True, "certificate_1": "Cert III in Fitness", "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Maintain",
        "community_engaged": False, "engagement_notes": "Strong footy focus, limited community commitments"
    },
    {
        "jumper_no": 6, "listing": "List", "dob": "1996-02-28", "state": "NSW",
        "has_children": True, "program": "AFL SportsReady",
        "area_of_schooling": "Central Coast NSW", "education_study": "Diploma of Business",
        "university": None, "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert IV in Business", "certificate_2": None,
        "body_load_tier": 3, "body_goal": "Maintain lean mass",
        "community_engaged": True, "engagement_notes": "Club captain. Active in club's mental health initiatives."
    },
    {
        "jumper_no": 7, "listing": "Draft", "dob": "2000-11-12", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Geelong Region", "education_study": "Bachelor of Physiotherapy",
        "university": "Deakin University", "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Maintain weight and conditioning",
        "community_engaged": False, "engagement_notes": "Studying physio — high academic load"
    },
    {
        "jumper_no": 8, "listing": "List", "dob": "1995-06-03", "state": "VIC",
        "has_children": True, "program": "AFL SportsReady",
        "area_of_schooling": "Dandenong Region", "education_study": "Advanced Diploma of Management",
        "university": None, "study_monday": False, "study_wednesday": False,
        "study_thursday": True, "certificate_1": "Cert IV in Leadership", "certificate_2": "Cert III in Business",
        "body_load_tier": 4, "body_goal": "Rehabilitation and recovery focus",
        "community_engaged": True, "engagement_notes": "Involved in FReeZa youth arts program"
    },
    {
        "jumper_no": 9, "listing": "Rookie", "dob": "2001-12-22", "state": "QLD",
        "has_children": False, "program": "Next Step QLD",
        "area_of_schooling": "Far North QLD", "education_study": "Diploma of Sport and Recreation",
        "university": None, "study_monday": True, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert III in Sport & Recreation", "certificate_2": None,
        "body_load_tier": 4, "body_goal": "Injury recovery / maintain mass",
        "community_engaged": True, "engagement_notes": "Strong ATSI community connections — ambassador for local programs"
    },
    {
        "jumper_no": 10, "listing": "Trade", "dob": "1997-08-14", "state": "SA",
        "has_children": False, "program": "AFL SportsReady",
        "area_of_schooling": "South Australia", "education_study": "Bachelor of Commerce",
        "university": "University of Adelaide", "study_monday": False, "study_wednesday": True,
        "study_thursday": True, "certificate_1": "Cert III in Business", "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Maintain",
        "community_engaged": True, "engagement_notes": "Community school visits, AFL Multicultural ambassador"
    },
    {
        "jumper_no": 11, "listing": "Int'l", "dob": "1999-03-30", "state": "NSW",
        "has_children": False, "program": "AFL SportsReady",
        "area_of_schooling": "Country NSW", "education_study": "Bachelor of Exercise & Sport Science",
        "university": "Charles Sturt University", "study_monday": True, "study_wednesday": False,
        "study_thursday": False, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Add lean mass to frame",
        "community_engaged": False, "engagement_notes": "International scholarship recruit — settling into club life"
    },
    {
        "jumper_no": 12, "listing": "Draft", "dob": "2003-05-11", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Gippsland", "education_study": "Bachelor of Science",
        "university": "Monash University", "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Gain mass and strength",
        "community_engaged": True, "engagement_notes": "High academic achiever, Dux of year. Engaged in youth leadership programs."
    },
    {
        "jumper_no": 13, "listing": "List", "dob": "2001-07-07", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Eastern Suburbs", "education_study": "Diploma of Marketing",
        "university": None, "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert IV in Marketing & Communication", "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Maintain",
        "community_engaged": True, "engagement_notes": "Socially active, popular community figure"
    },
    {
        "jumper_no": 14, "listing": "Draft", "dob": "2000-10-25", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Western Suburbs", "education_study": "Bachelor of Laws",
        "university": "University of Melbourne", "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 3, "body_goal": "Maintain conditioning",
        "community_engaged": False, "engagement_notes": "Heavy study load — law degree"
    },
    {
        "jumper_no": 15, "listing": "List", "dob": "1998-04-19", "state": "WA",
        "has_children": False, "program": "AFL SportsReady",
        "area_of_schooling": "Perth East", "education_study": "Cert IV in Personal Training",
        "university": None, "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert III in Fitness", "certificate_2": "Cert IV in Personal Training",
        "body_load_tier": 2, "body_goal": "Maintain versatile fitness",
        "community_engaged": True, "engagement_notes": "Runs footy clinics for kids in WA each off-season"
    },
    {
        "jumper_no": 16, "listing": "Draft", "dob": "2005-01-03", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Northern Suburbs", "education_study": "Bachelor of Commerce",
        "university": "La Trobe University", "study_monday": True, "study_wednesday": False,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Build base strength",
        "community_engaged": True, "engagement_notes": "Italian heritage ambassador — AFL multicultural programs"
    },
    {
        "jumper_no": 17, "listing": "Trade", "dob": "2000-09-05", "state": "WA",
        "has_children": False, "program": "AFL SportsReady",
        "area_of_schooling": "Perth Suburbs", "education_study": "Bachelor of Science",
        "university": "Curtin University", "study_monday": True, "study_wednesday": True,
        "study_thursday": False, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Maintain tall frame conditioning",
        "community_engaged": False, "engagement_notes": "New to club following trade, settling in"
    },
    {
        "jumper_no": 18, "listing": "Trade", "dob": "1998-07-20", "state": "QLD",
        "has_children": True, "program": "Next Step QLD",
        "area_of_schooling": "South Queensland", "education_study": "Diploma in Nutrition",
        "university": None, "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert III in Nutrition & Dietetics", "certificate_2": None,
        "body_load_tier": 3, "body_goal": "Recover and maintain",
        "community_engaged": True, "engagement_notes": "Active in South Sudanese community. AFL Ambassador."
    },
    {
        "jumper_no": 19, "listing": "Draft", "dob": "2004-06-18", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Inner City Melbourne", "education_study": "Bachelor of Arts",
        "university": "University of Melbourne", "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Maintain small frame speed",
        "community_engaged": True, "engagement_notes": "High-profile media commitments, social media ambassador"
    },
    {
        "jumper_no": 20, "listing": "List", "dob": "1994-10-06", "state": "SA",
        "has_children": True, "program": "AFL SportsReady",
        "area_of_schooling": "Port Augusta", "education_study": "Advanced Diploma Business",
        "university": None, "study_monday": False, "study_wednesday": False,
        "study_thursday": True, "certificate_1": "Cert IV in Leadership", "certificate_2": "Cert III in Business",
        "body_load_tier": 4, "body_goal": "Maintain elite condition",
        "community_engaged": True, "engagement_notes": "Club veteran. Mentors younger players."
    },
    {
        "jumper_no": 21, "listing": "Draft", "dob": "2006-02-12", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Eastern Suburbs", "education_study": "VCE / Year 12",
        "university": None, "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Build size and strength",
        "community_engaged": True, "engagement_notes": "Social media sensation — managed club appearances carefully"
    },
    {
        "jumper_no": 22, "listing": "List", "dob": "1992-06-30", "state": "WA",
        "has_children": True, "program": "AFL SportsReady",
        "area_of_schooling": "South Perth", "education_study": "Bachelor of Business Admin",
        "university": "Murdoch University", "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert IV in Management", "certificate_2": None,
        "body_load_tier": 4, "body_goal": "Extend career longevity",
        "community_engaged": True, "engagement_notes": "Club legend. Finalising degree. Transition planning underway."
    },
    {
        "jumper_no": 23, "listing": "Draft", "dob": "2006-04-24", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Gippsland Region", "education_study": "TAFE Diploma",
        "university": None, "study_monday": True, "study_wednesday": False,
        "study_thursday": True, "certificate_1": "Cert III in Sport & Recreation", "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Gain weight and muscle",
        "community_engaged": True, "engagement_notes": "Active in regional community via Country VFL pathway"
    },
    {
        "jumper_no": 24, "listing": "Draft", "dob": "2004-08-30", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Frankston Region", "education_study": "Bachelor of Construction Management",
        "university": "RMIT University", "study_monday": False, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 3, "body_goal": "Recover and rebuild",
        "community_engaged": False, "engagement_notes": "Managing injury load. Academic studies continuing"
    },
    {
        "jumper_no": 25, "listing": "Draft", "dob": "2005-11-14", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Central Highlands", "education_study": "Bachelor of Commerce",
        "university": "Deakin University", "study_monday": True, "study_wednesday": True,
        "study_thursday": False, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Build strength and endurance",
        "community_engaged": True, "engagement_notes": "Emerging leader. Junior coach on Saturdays."
    },
    {
        "jumper_no": 26, "listing": "Draft", "dob": "2007-08-08", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Inner West Melbourne", "education_study": "TAFE Certificate",
        "university": None, "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": "Cert II in Skills for Work", "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Gain size and strength",
        "community_engaged": False, "engagement_notes": "Youngest on list. Transition to club life."
    },
    {
        "jumper_no": 27, "listing": "Draft", "dob": "2007-03-21", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Bayside", "education_study": "Bachelor of Architecture (Enrolled)",
        "university": "University of Melbourne", "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Add weight and muscle",
        "community_engaged": True, "engagement_notes": "Keen interest in design and sustainability projects"
    },
    {
        "jumper_no": 28, "listing": "Draft", "dob": "2004-12-05", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Yarra Ranges", "education_study": "Bachelor of Education",
        "university": "Australian Catholic University", "study_monday": True, "study_wednesday": False,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Maintain speed and power profile",
        "community_engaged": True, "engagement_notes": "Aspires to teach. School clinic programs."
    },
    {
        "jumper_no": 29, "listing": "Draft", "dob": "2004-05-17", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Geelong South", "education_study": "Bachelor of Health Science",
        "university": "Deakin University", "study_monday": False, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Build core and running capacity",
        "community_engaged": False, "engagement_notes": "Emerging VIC Inside 50 talent. Early stage career."
    },
    {
        "jumper_no": 30, "listing": "Draft", "dob": "2004-10-01", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "South Gippsland", "education_study": "Diploma of Sport Coaching",
        "university": None, "study_monday": True, "study_wednesday": False,
        "study_thursday": False, "certificate_1": "Cert III in Sport & Recreation", "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Maintain agility and speed",
        "community_engaged": True, "engagement_notes": "Assists local footy clubs in school holiday programs"
    },
    {
        "jumper_no": 31, "listing": "Draft", "dob": "2004-02-26", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Eastern Melbourne", "education_study": "Bachelor of Commerce",
        "university": "La Trobe University", "study_monday": True, "study_wednesday": True,
        "study_thursday": False, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Maintain mid/fwd conditioning",
        "community_engaged": True, "engagement_notes": "Regular school visit participant"
    },
    {
        "jumper_no": 32, "listing": "Rookie", "dob": "2002-09-09", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Northern Suburbs", "education_study": "Bachelor of Exercise Science",
        "university": "Victoria University", "study_monday": False, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Build explosive power",
        "community_engaged": False, "engagement_notes": None
    },
    {
        "jumper_no": 33, "listing": "Draft", "dob": "2006-07-15", "state": "QLD",
        "has_children": False, "program": "Next Step QLD",
        "area_of_schooling": "Gold Coast", "education_study": "Certificate in Business",
        "university": None, "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": "Cert II in Skills for Work", "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Build overall size",
        "community_engaged": True, "engagement_notes": "Active in QLD pathway community"
    },
    {
        "jumper_no": 34, "listing": "Cat B", "dob": "2001-11-08", "state": "VIC",
        "has_children": False, "program": "AFL SportsReady",
        "area_of_schooling": "Inner North Melbourne", "education_study": "Diploma of Sport Management",
        "university": None, "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert IV in Sport & Recreation", "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Maintain tall key position conditioning",
        "community_engaged": True, "engagement_notes": "School community visits. Background in Croatian community events."
    },
    {
        "jumper_no": 35, "listing": "Draft", "dob": "2007-12-25", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Western Suburbs", "education_study": "TAFE Certificate",
        "university": None, "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": "Cert II in Skills for Work", "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Build key forward frame",
        "community_engaged": False, "engagement_notes": "Early talent joining list in 2025 draft"
    },
    {
        "jumper_no": 36, "listing": "Draft", "dob": "2002-04-14", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Southern Suburbs", "education_study": "Bachelor of Construction Management",
        "university": "RMIT University", "study_monday": True, "study_wednesday": False,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 4, "body_goal": "Rehabilitate and rebuild — injury management",
        "community_engaged": True, "engagement_notes": "Recovering from serious injury. Actively engaged in club program."
    },
    {
        "jumper_no": 37, "listing": "Draft", "dob": "2006-10-31", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Country Victoria", "education_study": "VCE completed",
        "university": None, "study_monday": True, "study_wednesday": True,
        "study_thursday": False, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Add size and endurance",
        "community_engaged": True, "engagement_notes": "Country vic pathway player. Strong agricultural community ties."
    },
    {
        "jumper_no": 38, "listing": "Draft", "dob": "2004-07-16", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "South East Suburbs", "education_study": "Bachelor of Sport Science",
        "university": "Deakin University", "study_monday": False, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Develop ruck-forward conditioning",
        "community_engaged": False, "engagement_notes": "Studying to complement AFL career"
    },
    {
        "jumper_no": 40, "listing": "Draft", "dob": "2003-08-22", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Bayside", "education_study": "Bachelor of Nursing",
        "university": "Monash University", "study_monday": True, "study_wednesday": True,
        "study_thursday": True, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 2, "body_goal": "Versatile conditioning for dual def/fwd role",
        "community_engaged": True, "engagement_notes": "Community hospital visits, health ambassador"
    },
    {
        "jumper_no": 43, "listing": "List", "dob": "1993-05-23", "state": "SA",
        "has_children": True, "program": "AFL SportsReady",
        "area_of_schooling": "Adelaide Hills", "education_study": "Masters of Business (part-time)",
        "university": "University of Adelaide", "study_monday": False, "study_wednesday": True,
        "study_thursday": False, "certificate_1": "Cert IV in Leadership & Management", "certificate_2": None,
        "body_load_tier": 4, "body_goal": "Maintain and extend career longevity",
        "community_engaged": True, "engagement_notes": "AFL Ambassador. Community clinic leader."
    },
    {
        "jumper_no": 44, "listing": "Draft", "dob": "2006-01-12", "state": "VIC",
        "has_children": False, "program": "Next Step VIC",
        "area_of_schooling": "Northern Suburbs", "education_study": "Bachelor of Science (enrolled)",
        "university": "La Trobe University", "study_monday": True, "study_wednesday": True,
        "study_thursday": False, "certificate_1": None, "certificate_2": None,
        "body_load_tier": 1, "body_goal": "Build size and aerobic capacity",
        "community_engaged": True, "engagement_notes": "Young midfielder with strong academic record"
    },
]


def seed_engagement():
    print(f"Connecting to: {DATABASE_URL.split('@')[-1]}")
    engine = create_engine(DATABASE_URL)

    # Create table if it doesn't exist
    Base.metadata.create_all(bind=engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Clear existing data
        session.query(PlayerEngagement).delete()
        session.commit()
        print(f"Cleared existing engagement data.")

        for data in ENGAGEMENT_DATA:
            record = PlayerEngagement(**data)
            session.add(record)

        session.commit()
        print(f"✅ Successfully seeded engagement data for {len(ENGAGEMENT_DATA)} players.")
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_engagement()
