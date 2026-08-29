import { IRepositoryContainer } from './interfaces';
import { createMongoRepositories } from './mongo';
import { createPostgresRepositories } from './postgres';

export type DatabaseProvider = 'mongodb' | 'postgres';

let activeProvider: DatabaseProvider = 'mongodb';
let mongoContainer: IRepositoryContainer | null = null;
let postgresContainer: IRepositoryContainer | null = null;

export const getActiveProvider = (): DatabaseProvider => {
  return activeProvider;
};

export const setActiveProvider = (provider: DatabaseProvider) => {
  activeProvider = provider;
};

export const getRepositories = (): IRepositoryContainer => {
  if (activeProvider === 'postgres') {
    if (!postgresContainer) {
      postgresContainer = createPostgresRepositories();
    }
    return postgresContainer;
  }

  if (!mongoContainer) {
    mongoContainer = createMongoRepositories();
  }
  return mongoContainer;
};
