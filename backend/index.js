require("dotenv").config();
const connectMongoDB = require("./src/config/mongodb");
const app = require("./src/app");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectMongoDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
};

startServer();