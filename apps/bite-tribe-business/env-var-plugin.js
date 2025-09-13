const myOrgEnvRegex = /^NX_/i;

const envVarPlugin = {
  name: 'env-var-plugin',
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  setup(build) {
    const options = build.initialOptions;

    const envVars = {};
    for (const key in process.env) {
      if (myOrgEnvRegex.test(key)) {
        envVars[key] = process.env[key];
      }
    }

    options.define['process.env'] = JSON.stringify(envVars);
  },
};

module.exports = envVarPlugin;
