# Project Setup Guide

If you're receiving this project as a zip file, you'll need to set up the environment variables for it to run correctly.

## 1. Essentials
Make sure you have `Node.js` installed on your computer.

## 2. Install Dependencies
Open a terminal in the project folder and run:
```bash
npm install
```

## 3. Configuration
1.  Look for a file named `.env.example` in the project root.
2.  Make a copy of it and rename the copy to `.env`.
3.  Open the `.env` file. You will see:
    ```
    VITE_SUPABASE_URL=
    VITE_SUPABASE_PUBLISHABLE_KEY=
    ```
4.  You need to fill in these values. Ask the person who sent you this project for their **Supabase URL** and **Anon Key**, or use your own Supabase project credentials.

    It should look something like this:
    ```
    VITE_SUPABASE_URL=https://your-project-id.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```

## 4. Run the Project
Once the `.env` file is set up, run:
```bash
npm run dev
```

The app should now load without the "supabase url is missing" error.
