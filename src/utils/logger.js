class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
  }

  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }
}

export default Logger;
