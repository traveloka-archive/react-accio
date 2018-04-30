# Accio

[![Build Status](https://travis-ci.com/traveloka/react-accio.svg?token=gaQuTqspqGQczgzMvJr7&branch=master)](https://travis-ci.com/traveloka/react-accio)

Declaratively fetch multiple APIs with a single React component.

---
- [Why Accio](#why-accio)
  - [Resolver as a plugin](#resolver-as-a-plugin)
  - [Accio as a standardized interface](#accio-as-a-standardized-interface)
- [How to use](#how-to-use)
  - [Setup](#setup)
  - [Basic example](#basic-example)
  - [Specifying fetch options](#specifying-fetch-options)
  - [Deferring fetch](#deferring-fetch)
  - [Using render prop](#using-render-prop)
  - [Handling errors](#handling-errors)
  - [Using lifecycle props](#using-lifecycle-props)
  - [Delaying loading](#delaying-loading)
  - [Caching responses](#caching-responses)
  - [Complex fetching](#complex-fetching)
- [Writing a resolver](#writing-a-resolver)
- [Contributing](#contributing)

## Why Accio

### Resolver as a plugin

There already exists a couple of declarative fetching libraries, but Accio is different as it allows you to use different resolver for each Accio call. You can think resolvers as plugins for performing different fetch mechanisms. The ultimate goal is to have a collection of reusable plugins that hide implementation details of integrating with 3rd party services such as Twitter or Facebook APIs.

```jsx
// this example is just a concept and currently only has partial support
import createTwitterResolver from 'accio-resolver-twitter';
import createFacebookResolver from 'accio-resolver-facebook';

const TwitterResolver = createTwitterResolver(/* twitter API key */)
const FacebookResolver = createFacebookResolver(/* facebook API key */)

<Accio url="/my/tweets" resolver={TwitterResolver}>
  {renderMyTweets}
</Accio>

<Accio url="/my/facebook/posts" resolver={FacebookResolver}>
  {renderMyFBPosts}
</Accio>
```

### Accio as a standardized interface

Each 3rd party service has their own way to support integrations with our apps. Accio is an attempt to unify all of them in a simple API that helps React app developers build great user interfaces.

## How to use

### Setup

Using npm:
```
npm install --save react-accio
```
Using yarn:
```
yarn add react-accio
```
Importing Accio main component:
```js
import { Accio } from 'react-accio'
```

### Basic example

```jsx
<Accio url="https://www.google.com">
  {accioProps => (
    <div>
      {accioProps.loading && <Spinner />}
      {accioProps.error && <ErrorRenderer error={accioProps.error} />}
      {accioProps.response && <GoogleComRenderer data={accioProps.response} />}
    </div>
  )}
</Accio>
```

### Specifying fetch options

Accio comes with a default `window.fetch` resolver. You can pass the options such as `method` or `headers` as Accio props:
```jsx
<Accio
  url="https://api.example.com/data"
  method="POST"
  body={{ foo: 'bar' }}
  headers={{ "X-Powered-By": "Accio" }}
>
  {renderAccio}
</Accio>
```

### Deferring fetch

If you don't want Accio to start fetching immediately after render, use `defer` & `trigger`:
```jsx
<Accio
  url="https://api.example.com/data"
  defer
>
  {accioProps => (
    <div>
      <Button onClick={accioProps.trigger} loading={accioProps.loading}>Click me to start fetching</Button>
      <App data={accioProps.response} />
    </div>
  )}
</Accio>
```

### Using render prop

Render prop exposes 4 properties: loading, error, response, and trigger*:
```jsx
function renderData({ loading, error, response, trigger }) {
  if (error) {
    return <div>{`Error! ${error.message}`}</div>
  }
  if (loading) {
    return <Spinner />
  }
  if (response) {
    return <DataTable data={response} />
  }
  return null;
}

<Accio url="https://api.example.com/data">
  {renderData}
</Accio>
```

### Handling errors

Error handling can be done by either rendering error component inside render prop OR specifying `onError` callback prop:
```jsx
<Accio
  url="https://api.example.com/data"
  onError={error => Raven.captureException(error)}
>
  {fetchProps => (
    <ErrorHandler error={fetchProps.error} />
  )}
</Accio>
```

### Using lifecycle props

Lifecycle props provide an alternative way to react to fetch state changes. There are 4 currently supported lifecycle callbacks: `onStartFetching`, `onShowLoading`, `onComplete`, and `onError`:
```jsx
<Accio
  url="https://api.example.com/data"
  onStartFetching={() => console.log('start fetching...')}
  onShowLoading={() => console.log('loading should now be shown...')}
  onComplete={data => console.log('data loaded', data)}
  onError={error => Raven.captureException(error)}
>
  {renderData}
</Accio>
```

### Delaying loading

Accio supports delaying loading so that your loading component will only be rendered after specified milliseconds. Use `timeout` prop:
```jsx
<Accio
  url="https://api.example.com/data"
  timeout={600}
>
  {renderData}
</Accio>
```

### Caching responses

This is an experimental feature. Use it at your own risk!

Accio can cache your responses if it detects at least two identical endpoints with the same request payload. But you have to make it *explicit* in order to do so:
```jsx
import { Accio, AccioCacheProvider } from 'accio'

// on top of your app
<AccioCacheProvider>
  <MyApp />
</AccioCacheProvider>

// inside your app
<div>
  {/* first fetch will hit the network & store to the nearest provider */}
  <Accio url="https://api.example.com/data">{renderPageHeader}</Accio>

  {/* subsequent fetches will WAIT for the first resolver to complete fetching & storing to the cache */}
  {/* only then it will read from the cache */}
  <Accio url="https://api.example.com/data">{renderPageContent}</Accio>

  {/* use ignoreCache prop to skip cache reading & always fetch fresh data from network */}
  <Accio url="https://api.example.com/data" ignoreCache>{renderPageFooter}</Accio>
</div>
```

### Complex fetching

Sometimes you want to do complex fetching mechanism such as polling. You cannot do that using render-prop without too many hacks. Thankfully, Accio provides an escape hatch for this use case where you can access its resolver anytime conveniently. That said, you can go back to imperative style coding by extracting Accio resolver:

```jsx
const fetchAPI = Accio.defaults.resolver;

componentDidMount() {
  // start polling
  this.poller = setInterval(async () => {
    const response = await fetchAPI(
      'https://api.example.com/pollData',
      { data: {...}, method: 'POST' },
    );
    if (response.data.completed === true) {
      clearInterval(this.poller);
    }
  }, POLL_INTERVAL);
}
```

## Writing a resolver

When you buy a car, you get a working vehicle already assembled and preconfigured for you by the manufacturer. But sometimes you want more powers out of it, so instead of buying a new car (which would cost you another fortune) you can just replace the engine with a superior one, leaving the body, interior, and everything else the same. Accio works the same way, it allows you to replace the built-in resolver with a custom one that is more suitable to your use cases. Think of an Accio resolver as the engine in the car analogy, i.e., **if you want more control over how you fetch data from the network (e.g., use `axios` instead of `window.fetch`) just write your own custom resolver**.

Accio resolver has the following typedef:
```js
type Resolver = (
  url: string,
  fetchOptions: Object,
  context: Object
) => Promise<any>;
```

Resolver arguments are given based on the following rules:
1. url => Accio `url` prop
2. fetchOptions => any Accio prop that is not:
    - 'children',
    - 'url',
    - 'context',
    - 'defer',
    - 'ignoreCache',
    - 'onComplete',
    - 'onError',
    - 'onShowLoading',
    - 'onStartFetching',
    - 'timeout',
    - '_cache'
3. context => Accio `context` prop

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)