import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || "changeme_dev_secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "changeme_dev_refresh_secret",
  jwtExpiresIn: "15m",
  jwtRefreshExpiresIn: "7d",
  nodeEnv: process.env.NODE_ENV || "development",
};
