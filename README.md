# Bhopal Tourism Multimedia App

An interactive tourism web application designed to showcase the **heritage, culture, nature, museums, monuments and tourist attractions of Bhopal, Madhya Pradesh** through multimedia content and interactive 3D experiences.

# 🌐 Live Website

**[Visit Bhopal Tourism Website](https://bhopal-tourism-project.onrender.com/)**

---

# About the Project

Bhopal Tourism Multimedia App is a full-stack web application that provides an interactive platform for exploring important tourist destinations in Bhopal.

The application combines traditional destination information with:

* 📸 High-quality destination photographs
* 🎧 Audio guides
* 🎥 Video content
* 🗺️ Interactive maps
* 🧊 Interactive 3D GLB models
* 📍 Geo-location and coordinates
* 👨‍💼 Admin dashboard for content management

The main objective is to provide tourists with an engaging digital experience for discovering Bhopal's major attractions.

---

# Key Features

# Destination Exploration

* Detailed information about tourist destinations
* Destination descriptions
* Categories and important visitor information
* Timings, entry fee and best visiting time
* Related destinations

# Interactive 3D Models

Selected destinations include interactive **GLB 3D models** that can be explored directly through the website.

The models include landmarks, architecture, environmental elements and tourism-related details to provide a more immersive experience.

# Multimedia Gallery

Each destination can contain multiple types of media:

* Photos
* Videos
* Audio guides
* 3D models

# Audio Guide

Visitors can listen to audio content associated with destinations directly from the website.

# Video Integration

YouTube videos can be linked to destinations to provide additional visual information.

# Interactive Map

The application uses **Leaflet and OpenStreetMap** to display destination locations and geographical coordinates.

# Admin Dashboard

The admin panel allows authorized administrators to:

* Create destinations
* Edit destination information
* Add destination photos
* Upload audio guides
* Add YouTube videos
* Upload 3D GLB models
* Manage destination media
* Manage geographical coordinates

---

# Featured Destinations

The application currently contains multiple important tourist destinations of Bhopal, including:

* Upper Lake (Bhojtal)
* Van Vihar National Park
* Sanchi Stupa
* Taj-ul-Masajid
* State Museum Bhopal
* Gauhar Mahal
* Tribal Museum
* Moti Masjid
* And other selected Bhopal attractions

---

# Technology Stack

# Frontend

* HTML5
* Tailwind CSS
* JavaScript
* Three.js / WebGL
* Leaflet
* OpenStreetMap

# Backend

* Python
* Flask
* Gunicorn

# Database

* MySQL
* Aiven Cloud

# Media Storage

* Cloudinary

# Deployment

* GitHub
* Render

---

# Project Architecture

```text
Bhopal Tourism Multimedia App
│
├── Frontend
│   ├── HTML
│   ├── Tailwind CSS
│   ├── JavaScript
│   ├── Three.js / WebGL
│   └── Leaflet / OpenStreetMap
│
├── Backend
│   └── Flask
│
├── Database
│   └── MySQL / Aiven
│
├── Media Storage
│   └── Cloudinary
│
└── Deployment
    ├── GitHub
    └── Render
```

---

# Project Structure

```text
bhopal_tourism/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── db.py
│   └── create_admin.py
│
├── database/
│   └── schema.sql
│
├── frontend/
│   └── templates/
│
├── uploads/
│
├── requirements.txt
├── README.md
└── .gitignore
```

---

# Running the Project Locally

# 1. Clone the repository

```bash
git clone https://github.com/sangD-1/bhopal_tourism_project.git
cd bhopal_tourism_project
```

# 2. Install dependencies

```bash
pip install -r requirements.txt
```

# 3. Configure MySQL

Create/configure the MySQL database and run:

```text
database/schema.sql
```

Set the required database environment variables:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_DATABASE
```

# 4. Run the application

```bash
python backend/app.py
```

# 5. Open in browser

```text
http://127.0.0.1:5000
```

---

# Admin Panel

The application includes a secure admin dashboard for managing tourism content.

The administrator can dynamically add and manage:

**Destinations → Photos → Videos → Audio Guides → 3D Models → Location Data**

This allows the tourism portal to be updated without modifying the frontend code manually.

---

# Cloud Deployment

The application is deployed using:

**GitHub → Render → Aiven MySQL + Cloudinary**

* GitHub stores the source code.
* Render hosts the Flask web application.
* Aiven provides the cloud MySQL database.
* Cloudinary stores uploaded multimedia assets such as images, audio and 3D models.

---

# Project Objective

The goal of the project is to create a modern digital tourism platform for Bhopal that goes beyond static text and images.

By combining **interactive maps, multimedia content, audio guides and 3D visualization**, the application provides visitors with a more engaging way to explore Bhopal's tourist destinations.

---

# Future Scope

Possible future improvements include:

* AI-based tourism recommendations
* Personalized travel itinerary generation
* Online ticket/booking integration
* Multilingual tourism support
* AR-based landmark visualization
* AI-powered virtual tourism assistant
* More detailed 3D destination models
* Tourist route and navigation planning

---

# Developer

**Sangeeta Dhurve**
0801IT231114
B.Tech – Information Technology
**Ayush Sharma**
0801IT24D02
B.tech - Information Technology

---

# License

This project is developed for educational and academic purposes.


#  Live Website

[Visit Bhopal Tourism Website](https://bhopal-tourism-project.onrender.com)
