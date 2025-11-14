import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';
import '@testing-library/jest-dom';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
