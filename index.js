import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123456",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function fetchUsers(){
  let users = []
  const data = await db.query("SELECT * FROM users")
  data.rows.forEach((user) => {
    users.push(user)
  })
  return users
}

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries INNER JOIN users ON user_id = users.id WHERE users.id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const users = await fetchUsers()
  const color = (await db.query("SELECT color FROM users WHERE id = $1",[currentUserId])).rows[0].color
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1,$2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});


app.post("/user", async (req, res) => {
  const data = req.body
  
  // console.log(data)
  if (data.user){
    currentUserId = data.user
    res.redirect("/")
  }
  else if (data.add){
    res.render("new.ejs")
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const newUser = (await db.query("INSERT INTO users(name, color) VALUES($1,$2) RETURNING *", [req.body.name, req.body.color])).rows[0]
  users.push(newUser)
  res.redirect("/")
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});