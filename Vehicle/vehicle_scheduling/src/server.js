const express = require("express");
const morgan = require("morgan");
const dotenv = require("dotenv");
const schedulerRoutes = require("./routes/schedulerRoutes");

dotenv.config();

const app = express();

app.use(express.json());
app.use(morgan("combined"));

app.use("/", schedulerRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
