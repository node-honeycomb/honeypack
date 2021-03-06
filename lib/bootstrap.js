const fs = require('fs');
const path = require('path');
const {commandGenerator, errorHandler, asyncMiddleware} = require('./helpers');

function bootstrap(command, options, ...args) {
  const action = require(`./${command}`);
  const {config = ''} = options;
  const configPath = path.resolve(process.cwd(), config);
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  function run() {
    return new Promise(resolve => resolve(action({...options, env}, ...args))).catch(errorHandler);
  }

  if (command !== 'init' && !fs.existsSync(configPath)) {
    const init = require('./init');

    return init({output: config, _passive: true, env}).then(run);
  }

  return Promise.resolve().then(run);
}

module.exports = (program) => {
  const command = commandGenerator.bind(program);

  command('init', ['output', 'default'], bootstrap);
  command({command: 'run', alias: 'start'}, ['config', 'host', 'port'], bootstrap);
  command('build', ['config'], bootstrap);

  program.parse(process.argv);
};

module.exports.middleware = (options) => {
  const defaultOptions = {
    config: 'webpack.config.js',
    root: './assets',
    hot: false
  };
  const opts = Object.assign({}, defaultOptions, options);
  const middleware = bootstrap('middleware', {
    config: path.join(opts.root, opts.config),
    hot: opts.hot
  });

  return opts.hot ? asyncMiddleware(
    async (...args) => {
      const fn = await middleware;

      fn[0](...args);
    },
    async (...args) => {
      const fn = await middleware;

      fn[1](...args);
    }
  ) : asyncMiddleware(async (...args) => {
    const fn = await middleware;

    fn(...args);
  });
};
