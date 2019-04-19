import 'dom-testing-library/extend-expect';

import React from 'react';
import ReactDOM from 'react-dom';
import defaultResolver from '../defaults/resolver';

import { Accio, AccioCacheProvider } from '../index';
import { render, wait, Simulate } from 'react-testing-library';

const renderAccio = (fetchState) => (
  <div>
    {fetchState.loading && <div data-testid="loading" />}
    {fetchState.error && <div data-testid="error" />}
    {fetchState.response && (
      <div data-testid="response">{JSON.stringify(fetchState.response)}</div>
    )}
  </div>
);

const mockAPIResponse = {
  foo: 'bar',
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  Accio.defaults.resolver = createResolver();
});

describe('<Accio />', () => {
  test('Basic use', async () => {
    const { getByTestId } = render(
      <Accio {...basicProps}>{renderAccio}</Accio>
    );

    expect(getByTestId('loading')).toBeInTheDocument();

    await wait(() => {
      expect(getByTestId('response')).toBeInTheDocument();
    });
  });

  test('Updated fetchKey should trigger refetch', async () => {
    const resolverSpy = jest.spyOn(Accio.defaults, 'resolver');

    class App extends React.Component {
      state = {
        body: { foo: 'bar' },
      };

      handleClick = () => {
        this.setState({
          body: { foo: 'baz' },
        });
      };

      render() {
        return (
          <React.Fragment>
            <Accio
              {...basicProps}
              body={this.state.body}
              fetchKey={({ body }) => JSON.stringify(body)}
            >
              {renderAccio}
            </Accio>
            <button onClick={this.handleClick}>Update</button>
          </React.Fragment>
        );
      }
    }

    const { getByText, getByTestId } = render(<App />);

    await wait();

    expect(resolverSpy).toHaveBeenCalledTimes(1);
    expect(getByTestId('response')).toBeInTheDocument();
    
    // update!!
    const updateBtn = getByText('Update');
    Simulate.click(updateBtn);

    await wait();

    // should resolve again
    expect(resolverSpy).toHaveBeenCalledTimes(2);
  });

  test('Network error', async () => {
    // simulate network error on the resolver
    const errorMessage = 'error';
    Accio.defaults.resolver = createResolver({ error: true, errorMessage });

    let error = null;
    const onError = jest.fn((err) => {
      error = err;
    });

    const { getByTestId } = render(
      <Accio {...basicProps} onError={onError}>
        {renderAccio}
      </Accio>
    );

    expect(getByTestId('loading')).toBeInTheDocument();

    await wait(() => {
      expect(getByTestId('error')).toBeInTheDocument();
    });

    // test onError lifecycle hook
    expect(onError).toHaveBeenCalledWith(error);
  });

  test('Lifecycle hooks', async () => {
    const onShowLoading = jest.fn();
    const onComplete = jest.fn();
    const onStartFetching = jest.fn();

    render(
      <Accio
        {...basicProps}
        onStartFetching={onStartFetching}
        onShowLoading={onShowLoading}
        onComplete={onComplete}
      >
        {renderAccio}
      </Accio>
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
    Accio.defaults.resolver = createResolver({ delayMs: 2 });

    const onShowLoading = jest.fn();

    render(
      <Accio {...basicProps} timeout={1} onShowLoading={onShowLoading}>
        {renderAccio}
      </Accio>
    );
    // should not be called on first render
    expect(onShowLoading).not.toHaveBeenCalled();

    // wait until it's called
    await wait(() => {
      expect(onShowLoading).toHaveBeenCalled();
    });
  });

  test('Deferred fetch', () => {
    const resolverSpy = jest.spyOn(Accio.defaults, 'resolver');
    const { getByText } = render(
      <Accio {...basicProps} defer>
        {({ trigger }) => <button onClick={trigger}>Go!</button>}
      </Accio>
    );
    expect(resolverSpy).not.toHaveBeenCalled();
    Simulate.click(getByText('Go!'));
    expect(resolverSpy).toHaveBeenCalled();
  });

  test('Cached fetch', async () => {
    const resolverSpy = jest.spyOn(Accio.defaults, 'resolver');

    function Content() {
      return (
        <div>
          <Accio {...basicProps}>{renderAccio}</Accio>
          <Accio {...basicProps}>{renderAccio}</Accio>
          <Accio {...basicProps} ignoreCache>
            {renderAccio}
          </Accio>
        </div>
      );
    }

    function App() {
      return (
        <AccioCacheProvider>
          <Content />
        </AccioCacheProvider>
      );
    }

    // will use this render method until Enzyme supports context
    const div = document.createElement('div');
    ReactDOM.render(<App />, div);

    // flush all promises
    await new Promise((resolve) => setImmediate(resolve));

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
    const resolverSpy = jest.spyOn(Accio.defaults, 'resolver');
    render(<Accio {...basicProps}>{renderAccio}</Accio>);
    expect(resolverSpy).toBeCalledWith(
      basicProps.url,
      expect.objectContaining({
        body: basicProps.body,
        method: Accio.defaults.method,
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

    notFunctionTypes.forEach((type) => {
      try {
        Accio.defaults.resolver = type;
      } catch (e) {
        errorCount.resolver++;
      }

      try {
        Accio.defaults.method = type;
      } catch (e) {
        errorCount.method++;
      }
    });

    unsupportedMethods.forEach((method) => {
      try {
        Accio.defaults.method = method;
      } catch (e) {
        errorCount.method++;
      }
    });

    expect(errorCount.resolver).toBe(notFunctionTypes.length);
    expect(errorCount.method).toBe(
      notFunctionTypes.length + unsupportedMethods.length
    );
  });

  test('Preload deferred fetch', async () => {
    const resolverSpy = jest.spyOn(Accio.defaults, 'resolver');

    const resource = React.createRef();
    const { getByText } = render(
      <AccioCacheProvider>
        <Accio {...basicProps} defer ref={resource}>
          {({ trigger, loading, response }) => (
            <div>
              <button onClick={trigger}>Go!</button>
              {loading && <div>Loading indicator</div>}
              {response && <div>Response text</div>}
            </div>
          )}
        </Accio>
      </AccioCacheProvider>
    );

    expect(resolverSpy).not.toHaveBeenCalled();
    await resource.current.preload();
    expect(resolverSpy).toHaveBeenCalled();

    // try repeat preloading
    await resource.current.preload();
    // preloading is no-op once cache has been warmed up
    expect(resolverSpy.mock.calls.length).toBe(1);

    // it should not yield the response just yet
    expect(() => {
      getByText('Response text');
    }).toThrow();

    // trigerring Accio should not call resolver again
    Simulate.click(getByText('Go!'));
    expect(resolverSpy.mock.calls.length).toBe(1);

    // already preloaded, no need to show loading indicator
    expect(() => {
      getByText('Loading indicator');
    }).toThrow();

    // instant, no "wait-for-expect" needed
    expect(getByText('Response text')).toBeInTheDocument();
  });

  test('Network error when preloading', async () => {
    // simulate network error on the resolver
    const errorMessage = 'error';
    const originalResolver = jest.fn(Accio.defaults.resolver);
    Accio.defaults.resolver = createResolver({ error: true, errorMessage });

    const resolverSpy = jest.spyOn(Accio.defaults, 'resolver');

    let error = null;
    const onError = jest.fn((err) => {
      error = err;
    });

    const resource = React.createRef();
    const { getByText } = render(
      <AccioCacheProvider>
        <Accio {...basicProps} defer ref={resource} onError={onError}>
          {({ trigger, loading, response }) => (
            <div>
              <button onClick={trigger}>Go!</button>
              {loading && <div>Loading indicator</div>}
              {response && <div>Response text</div>}
              {error && <div>Error message</div>}
            </div>
          )}
        </Accio>
      </AccioCacheProvider>
    );

    expect(resolverSpy.mock.calls.length).toBe(0);

    await resource.current.preload();
    expect(resolverSpy.mock.calls.length).toBe(1);

    // remove error
    Accio.defaults.resolver = originalResolver;

    // allow retry if previous one fails
    await resource.current.preload();
    expect(originalResolver.mock.calls.length).toBe(1);

    // once success, disallow retry (TODO: unless cache is invalidated)
    await resource.current.preload();
    expect(originalResolver.mock.calls.length).toBe(1);
  });

  test('Always fetch with the latest fetch options', () => {
    const resolverSpy = jest.spyOn(Accio.defaults, 'resolver');

    const requestBody = {
      foo: 'bar',
    };

    class App extends React.Component {
      state = {
        body: null,
      };

      fetch = (trigger) => () => {
        this.setState(
          {
            body: requestBody,
          },
          trigger
        );
      };

      render() {
        return (
          <Accio {...basicProps} body={this.state.body} defer>
            {({ trigger }) => (
              <button onClick={this.fetch(trigger)}>Fetch</button>
            )}
          </Accio>
        );
      }
    }

    const { getByText } = render(<App />);

    expect(resolverSpy).not.toHaveBeenCalled();
    Simulate.click(getByText('Fetch'));
    expect(resolverSpy.mock.calls[0][1].body).toEqual(requestBody);
  });
});

describe('Accio.defaults.resolver', () => {
  beforeEach(() => {
    Accio.defaults.resolver = defaultResolver;

    window.fetch = jest.fn((url, options) => {
      return Promise.resolve({
        json: () => {
          if (url === basicProps.url) {
            return Promise.resolve({
              data: {
                foo: 'bar',
              },
            });
          }
          return Promise.resolve({});
        },
      });
      return Promise.resolve();
    });
  });

  it('should behave correctly', async () => {
    const { getByTestId } = render(
      <Accio {...basicProps}>
        {(fetchProps) => (
          <div>
            {fetchProps.response && (
              <div data-testid="responseContainer">
                {fetchProps.response.data.foo}
              </div>
            )}
          </div>
        )}
      </Accio>
    );

    await wait(() => {
      expect(getByTestId('responseContainer')).toHaveTextContent('bar');
    });
  });

  it('should pass down url to window.fetch 1st argument as well as fetchOptions to window.fetch 2nd argument', () => {
    render(<Accio {...basicProps}>{() => null}</Accio>);

    expect(window.fetch).toHaveBeenCalledWith(
      basicProps.url,
      expect.objectContaining({
        body: {},
        method: 'GET',
      })
    );
  });
});
