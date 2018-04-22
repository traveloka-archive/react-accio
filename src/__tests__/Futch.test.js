import 'dom-testing-library/extend-expect'

import React from 'react';
import ReactDOM from 'react-dom';

import { Futch, FutchCacheProvider } from '../index';
import { render, wait, Simulate } from 'react-testing-library';

const renderFutch = fetchState => (
  <div>
    {fetchState.loading && <div data-testid="loading" />}
    {fetchState.error && <div data-testid="error" />}
    {fetchState.response && <div data-testid="response">{JSON.stringify(fetchState.response)}</div>}
  </div>
);

const mockAPIResponse = {
  foo: 'bar',
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function createResolver({ delayMs, error = false, errorMessage } = {}) {
  return async () => {
    if (delayMs) {
      await delay(delayMs);
    }
    if (error) {
      throw new Error(errorMessage);
    }
    return mockAPIResponse;
  };
}

const basicProps = {
  url: '/fetch/foo',
  body: {},
  context: {
    domain: 'flight',
  },
};

beforeEach(() => {
  Futch.defaults.resolver = createResolver();
});

describe('<Futch />', () => {
  test('Basic use', async () => {
    const { getByTestId } = render(<Futch {...basicProps}>{renderFutch}</Futch>);

    expect(getByTestId('loading')).toBeInTheDOM();

    await wait(() => {
      expect(getByTestId('response')).toBeInTheDOM(true);
    });
  });

  test('Network error', async () => {
    // simulate network error on the resolver
    const errorMessage = 'error';
    Futch.defaults.resolver = createResolver({ error: true, errorMessage });

    let error = null;
    const onError = jest.fn(err => {
      error = err;
    });

    const { getByTestId } = render(
      <Futch {...basicProps} onError={onError}>
        {renderFutch}
      </Futch>
    );

    expect(getByTestId('loading')).toBeInTheDOM();

    await wait(() => {
      expect(getByTestId('error')).toBeInTheDOM();
    });

    // test onError lifecycle hook
    expect(onError).toHaveBeenCalledWith(error);
  });

  test('Lifecycle hooks', async () => {
    const onShowLoading = jest.fn();
    const onComplete = jest.fn();
    const onStartFetching = jest.fn();

    render(
      <Futch {...basicProps} onStartFetching={onStartFetching} onShowLoading={onShowLoading} onComplete={onComplete}>
        {renderFutch}
      </Futch>
    );

    // should be called immediately
    expect(onStartFetching).toHaveBeenCalled();

    // should also be called immediately since we don't specify any timeouts
    expect(onShowLoading).toHaveBeenCalled();

    // wait until resolved
    await wait(() => {
      expect(onComplete).toHaveBeenCalledWith(mockAPIResponse);
    });
  });

  test('Loading timeout', async () => {
    Futch.defaults.resolver = createResolver({ delayMs: 2 });

    const onShowLoading = jest.fn();

    render(
      <Futch {...basicProps} timeout={1} onShowLoading={onShowLoading}>
        {renderFutch}
      </Futch>
    );
    // should not be called on first render
    expect(onShowLoading).not.toHaveBeenCalled();

    // wait until it's called
    await wait(() => {
      expect(onShowLoading).toHaveBeenCalled();
    });
  });

  test('Deferred fetch', () => {
    const resolverSpy = jest.spyOn(Futch.defaults, 'resolver');
    const { getByText } = render(
      <Futch {...basicProps} defer>
        {({ trigger }) => (
          <button onClick={trigger}>
            Go!
          </button>
        )}
      </Futch>
    );
    expect(resolverSpy).not.toHaveBeenCalled();
    Simulate.click(getByText('Go!'));
    expect(resolverSpy).toHaveBeenCalled();
  });

  test('Cached fetch', async () => {
    const resolverSpy = jest.spyOn(Futch.defaults, 'resolver');

    function Content() {
      return (
        <div>
          <Futch {...basicProps}>{renderFutch}</Futch>
          <Futch {...basicProps}>{renderFutch}</Futch>
          <Futch {...basicProps} ignoreCache>
            {renderFutch}
          </Futch>
        </div>
      );
    }

    function App() {
      return (
        <FutchCacheProvider>
          <Content />
        </FutchCacheProvider>
      );
    }

    // will use this render method until Enzyme supports context
    const div = document.createElement('div');
    ReactDOM.render(<App />, div);

    // flush all promises
    await new Promise(resolve => setImmediate(resolve));

    // expect resolver to be called twice because
    // the third fetch will always hit the network (ignoreCache)
    // and the second one will read from cache
    //
    //    1          1          2
    // Network --> Cache --> Network (ignoreCache)
    expect(resolverSpy.mock.calls.length).toBe(2);

    // cleanup
    ReactDOM.unmountComponentAtNode(div);
  });

  test('Freeze resolver API', () => {
    const resolverSpy = jest.spyOn(Futch.defaults, 'resolver');
    render(<Futch {...basicProps}>{renderFutch}</Futch>);
    expect(resolverSpy).toBeCalledWith(
      basicProps.url,
      expect.objectContaining({
        body: basicProps.body,
        method: Futch.defaults.method,
      }),
      basicProps.context
    );
  });

  test('Defaults assignment validations', () => {
    const notFunctionTypes = [null, 0, undefined, '', true, [], {}];
    const unsupportedMethods = ['PUT', 'PATCH', 'HEAD', 'DELETE'];
    const errorCount = {
      resolver: 0,
      method: 0,
    };

    notFunctionTypes.forEach(type => {
      try {
        Futch.defaults.resolver = type;
      } catch (e) {
        errorCount.resolver++;
      }

      try {
        Futch.defaults.method = type;
      } catch (e) {
        errorCount.method++;
      }
    });

    unsupportedMethods.forEach(method => {
      try {
        Futch.defaults.method = method;
      } catch (e) {
        errorCount.method++;
      }
    });

    expect(errorCount.resolver).toBe(notFunctionTypes.length);
    expect(errorCount.method).toBe(notFunctionTypes.length + unsupportedMethods.length);
  });
});
