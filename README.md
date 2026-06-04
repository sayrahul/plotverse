# 🗺️ PlotVerse Setup Guide

Welcome to **PlotVerse**! This is a simple, step-by-step guide to help you run this website on your computer. Don't worry, we will go through it one small step at a time!

---

## 🛠️ Step 1: Install Node.js (If you haven't already)
Node.js is like the engine that runs this website on your computer.
1. Open your internet browser (like Google Chrome) and go to: [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS (Long Term Support)** version (it is the safest and most stable).
3. Open the downloaded file and click **Next** -> **Next** -> **Finish** (just like installing any game or software).

To check if it installed correctly:
* Open your command line (press the `Windows Key` on your keyboard, type `cmd`, and press Enter).
* Type `node -v` and press Enter. You should see a version number like `v18.x.x` or `v20.x.x`.

---

## 💻 Step 2: Open the Project in VS Code
1. Open **Visual Studio Code**.
2. Click on **File** in the top-left corner, then click **Open Folder...**
3. Select this folder (`d:\My Web Sites\Plotverse`) and click **Select Folder**.

---

## 🖥️ Step 3: Open the Terminal in VS Code
VS Code has a built-in command prompt (terminal) where we tell the project what to do.
1. In VS Code, click on **Terminal** in the top menu bar.
2. Click on **New Terminal**.
3. A panel will open up at the bottom of your screen. That is your terminal!

---

## 📦 Step 4: Install Dependencies (Packages)
This project uses pre-made code pieces (like building blocks) called packages. 
* In the terminal at the bottom of VS Code, type this and press Enter:
  ```bash
  npm install
  ```
* *Note: If these packages are already installed, this will verify that everything is up-to-date and ready.*

---

## 🔑 Step 5: Setup Environment Variables (The Key Configuration)
Our website needs configuration files to connect to database services. We need to create a settings file:
1. In the file list on the left side of VS Code, look for a file named `.env.example`.
2. Right-click on it, choose **Copy**, and then right-click and choose **Paste** (or press `Ctrl+C` then `Ctrl+V`).
3. Rename this copy to exactly: `.env.local` (make sure there is a dot at the start!).
4. For testing locally, you can leave the values blank or configure them if you want to connect to a real Firebase database and Mapbox map interface.

---

## 🎮 Step 6: How to Run the Project!

You can run the project in two different ways:

### Option A: Run it locally with the Simulator (Easiest & Free)
This project comes with a **Firebase Emulator Suite** which acts like a fake database running entirely on your computer!
1. Start the emulator by typing this in your terminal and pressing Enter:
   ```bash
   npm run emulators
   ```
2. Open a **second terminal window** (click the `+` icon on the terminal header in VS Code).
3. Start the website by typing this and pressing Enter:
   ```bash
   npm run dev
   ```

### Option B: Run the Website directly
If you just want to run the front-end interface:
1. Type this in your terminal and press Enter:
   ```bash
   npm run dev
   ```

---

## 🚀 Step 7: Open the Website in your Browser!
Once you see a message in the terminal that says something like:
`Ready in 1.2s` or `- Local: http://localhost:3000`

1. Open your web browser (Chrome, Edge, Firefox, etc.).
2. Type this into the address bar at the top:
   ```text
   http://localhost:3000
   ```
3. Press Enter! You should now see your **PlotVerse** application running live! 🎉

---

## 💡 Quick Tips for Troubleshooting
* **How do I stop the server?** Press `Ctrl + C` in the terminal window, then type `Y` and press Enter.
* **Red errors in the terminal?** Make sure you ran `npm install` first. If you still see errors, try closing VS Code and opening it again.
