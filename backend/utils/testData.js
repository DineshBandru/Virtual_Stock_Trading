const TEST_ACCOUNT_PATTERN = /(seed|test|demo|codex|dummy|fake|e2e|intermediate e2e|\+test|example\.com|example\.test)/i;
const TEST_INSTRUMENT_PATTERN = /(__order_test__|test|demo|dummy|fake|codex|e2e)/i;

const testingAccountFilter = {
  $nor: [
    { email: TEST_ACCOUNT_PATTERN },
    { name: TEST_ACCOUNT_PATTERN }
  ]
};

const testingAccountMatch = {
  $or: [
    { email: TEST_ACCOUNT_PATTERN },
    { name: TEST_ACCOUNT_PATTERN }
  ]
};

module.exports = {
  TEST_ACCOUNT_PATTERN,
  TEST_INSTRUMENT_PATTERN,
  testingAccountFilter,
  testingAccountMatch
};
