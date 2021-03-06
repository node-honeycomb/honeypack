const series = require('async/series');
const chalk = require('chalk');
const webpack = require('webpack');
const commandExists = require('command-exists');
const opts = require('./options');

function getPackageManager() {
  return commandExists('tnpm').catch(() => commandExists('cnpm')).catch(() => commandExists('npm'));
}

function pascalCase(string = '') {
  return string.replace(/(?:^|-)\w/g, match => match.replace('-', '').toUpperCase());
}

function promiseChain(promiseFns = [], param) {
  return promiseFns.reduce((prev, curr) => prev.then(curr), Promise.resolve(param));
}

function seriesRun(configs, callback) {
  return series(configs.map(config => cb => webpack(config, (err, stats) => {
    /* eslint-disable no-console */
    if (err) {
      console.error(chalk.red(err.stack || err));
      if (err.details) {
        console.error(chalk.red(err.details));
      }
      return cb(err);
    }

    const info = stats.toJson();

    if (stats.hasErrors()) {
      console.error(chalk.red(info.errors));
      return cb(info.errors);
    }

    if (stats.hasWarnings()) {
      console.warn(chalk.yellow(info.warnings));
    }

    cb(null, stats);
    /* eslint-enable no-console */
  })), callback);
}

function commandGenerator(command, options, action) {
  let cmd;

  if (typeof command === 'string') {
    cmd = this.command(command);
  } else if (typeof command === 'object') {
    Object.keys(command).forEach(key => cmd = (cmd || this)[key](command[key]));
  }

  options.forEach(option => cmd = cmd.option(...getOptionDesc(option)));

  cmd.action((...args) => {
    const cmd = args.pop();
    const opts = options.reduce((obj, curr) => {
      obj[curr] = cmd[curr] || getOptionDefault(curr);

      return obj;
    }, {});

    action(command.command || command, opts, ...args);
  });
}

function getOptionDesc(option) {
  return opts[option] ? opts[option].desc : [];
}

function getOptionDefault(option) {
  return opts[option] ? opts[option].default : undefined;
}

function errorHandler(err, prefix = 'Honeypack Internal') {
  process.stdout.write(chalk.red(`${prefix} ${err.stack || err}\n`));
  process.exit(1);
}

function safeMiddleware(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function asyncMiddleware(...fns) {
  return fns.length === 1 ? safeMiddleware(...fns) : fns.map(fn => safeMiddleware(fn));
}

module.exports = {
  getPackageManager,
  pascalCase,
  promiseChain,
  seriesRun,
  commandGenerator,
  errorHandler,
  asyncMiddleware
};
