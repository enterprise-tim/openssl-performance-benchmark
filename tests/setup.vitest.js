import { beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';

// Set up jsdom for D3 testing
beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.SVGElement = dom.window.SVGElement;
});

afterAll(() => {
  delete global.window;
  delete global.document;
  delete global.navigator;
  delete global.HTMLElement;
  delete global.SVGElement;
});

