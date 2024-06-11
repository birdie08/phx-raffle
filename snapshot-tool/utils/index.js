function loadPrivateKey() {
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY;
  }
}

module.exports = {
  loadPrivateKey,
};
