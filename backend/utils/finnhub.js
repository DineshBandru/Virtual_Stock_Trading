const axios = require("axios");

const finnhubClient = axios.create({
  baseURL: "https://finnhub.io/api/v1",
  timeout: 10000
});

const finnhubRequest = async (endpoint, params = {}) => {
  const apiKey = process.env.FINNHUB_API_KEY;
  const response = await finnhubClient.get(endpoint, {
    params: { ...params, token: apiKey }
  });
  return response.data;
};

module.exports = { finnhubRequest };
