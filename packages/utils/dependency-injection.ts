import { Container, interfaces } from 'inversify';

import 'reflect-metadata';

/**
 * `skipBaseClassChecks: true`
 * https://github.com/inversify/InversifyJS/blob/master/wiki/inheritance.md#workaround-e-skip-base-class-injectable-checks
 * is needed because of the abstract `EventRepository` class
 */
const container = new Container({ skipBaseClassChecks: true });

export const DependencyInjection = {
  registerProviders: (...providers: any[]) => providers.forEach(p => container.bind(p).toSelf()),

  registerFactory: (identifier: any, factory: (context: interfaces.Context) => any) =>
    container.bind(identifier).toFactory(factory),

  registerConstant: (identifier: any, constant: any) =>
    container.bind(identifier).toConstantValue(constant),

  registerSingleton: (identifier: any, provider?: any) =>
    provider
      ? container.bind(identifier).to(provider).inSingletonScope()
      : container.bind(identifier).toSelf().inSingletonScope(),

  getProvider: (provider: any): any => container.get(provider),
  bootstrap: (provider: any): any => container.get(provider),

  overrideProvider: (provider: any, newProvider: any) => {
    container.unbind(provider);
    container.bind(provider).to(newProvider);
  },

  getContainer: () => container,
};
