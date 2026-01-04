const express = require("express");
const path = require("path");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const { initDb } = require("./src/models/db");
const authRoutes = require("./src/routes/auth");
const commandRoutes = require("./src/routes/commands");
const projectRoutes = require("./src/routes/projects");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const sessionMiddleware = session({
  store: new SQLiteStore({ db: "sessions.sqlite" }),
  secret: "control-center-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
});

app.use(sessionMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/commands", commandRoutes);
app.use("/api/projects", projectRoutes);

const spaRoutes = [
  "/",
  "/my_commands",
  "/shared",
  "/projects",
  "/projects/:id",
  "/commands/:id",
];

app.get(spaRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 9998;

initDb().then(() => {
  console.log("Database initialized");
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Control Center running at http://0.0.0.0:${PORT}`);
  });
});
