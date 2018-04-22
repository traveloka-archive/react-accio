# Futch

[![Build Status](https://travis-ci.com/traveloka/futch.svg?token=gaQuTqspqGQczgzMvJr7&branch=master)](https://travis-ci.com/traveloka/futch)

Declaratively fetch multiple APIs with a single React component.

---

## Why Futch

### Resolver as a plugin

There already exists a couple of declarative fetching libraries, but Futch is different as it allows you to use different resolver for each Futch call. You can think resolvers as plugins for performing different fetch mechanisms. The ultimate goal is to have a collection of reusable plugins that hide implementation details of integrating with 3rd party services such as Twitter or Facebook APIs.

```jsx
// this example is just a concept and currently only has partial support
import createTwitterResolver from 'futch-resolver-twitter';
import createFacebookResolver from 'futch-resolver-facebook';

const TwitterResolver = createTwitterResolver(/* twitter API key */)
const FacebookResolver = createFacebookResolver(/* facebook API key */)

<Futch url="/my/tweets" resolver={TwitterResolver}>
  {renderMyTweets}
</Futch>

<Futch url="/my/facebook/posts" resolver={FacebookResolver}>
  {renderMyFBPosts}
</Futch>
```

### Futch as a standardized interface

Each 3rd party service has their own way to support integrations with our apps. Futch is an attempt to unify all of them in a simple API that helps React app developers build great user interfaces.

## How to use

### Setup

Using npm:
```
npm install --save futch
```
Using yarn:
```
yarn add futch
```
Importing Futch main component:
```js
import { Futch } from 'futch'
```

### Basic example

```jsx
<Futch url="https://www.google.com">
  {futchProps => (
    <div>
      {futchProps.loading && <Spinner />}
      {futchProps.error && <ErrorRenderer error={futchProps.error} />}
      {futchProps.response && <GoogleComRenderer data={futchProps.response} />}
    </div>
  )}
</Futch>
```

### Specifying fetch options

Futch comes with a default `window.fetch` resolver. You can pass the options such as `method` or `headers` as Futch props:
```jsx
<Futch
  url="https://api.example.com/data"
  method="POST"
  headers={{ "X-Powered-By": "Futch" }}
>
  {renderFutch}
</Futch>
```

### Deferring fetch

If you don't want Futch to start fetching immediately after render, use `defer` & `trigger`:
```jsx
<Futch
  url="https://api.example.com/data"
  defer
>
  {futchProps => (
    <div>
      <Button onClick={futchProps.trigger} loading={futchProps.loading}>Click me to start fetching</Button>
      <App data={futchProps.response} />
    </div>
  )}
</Futch>
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

<Fetch url="https://api.example.com/data">
  {renderData}
</Fetch>
```

### Handling errors

Error handling can be done by either rendering error component inside render prop OR specifying `onError` callback prop:
```jsx
<Futch
  url="https://api.example.com/data"
  onError={error => Raven.captureException(error)}
>
  {fetchProps => (
    <ErrorHandler error={fetchProps.error} />
  )}
</Futch>
```

### Using lifecycle props

Lifecycle props provide an alternative way to react to fetch state changes. There are 4 currently supported lifecycle callbacks: `onStartFetching`, `onShowLoading`, `onComplete`, and `onError`:
```jsx
<Futch
  url="https://api.example.com/data"
  onStartFetching={() => console.log('start fetching...')}
  onShowLoading={() => console.log('loading should now be shown...')}
  onComplete={data => console.log('data loaded', data)}
  onError={error => Raven.captureException(error)}
>
  {renderData}
</Futch>
```

### Delaying loading

Futch supports delaying loading so that your loading component will only be rendered after specified milliseconds. Use `timeout` prop:
```jsx
<Futch
  url="https://api.example.com/data"
  timeout={600}
>
  {renderData}
</Futch>
```

### Caching responses

This is an experimental feature. Use it at your own risk!

Futch can cache your responses if it detects at least two identical endpoints with the same request payload. But you have to make it *explicit* in order to do so:
```jsx
import { FutchCacheProvider } from 'futch'

// on top of your app
<FutchCacheProvider>
  <MyApp />
</FutchCacheProvider>

// inside your app
<div>
  {/* first fetch will hit the network & store to the nearest provider */}
  <Fetch url="https://api.example.com/data">{renderPageHeader}</Fetch>

  {/* subsequent fetches will WAIT for the first resolver to complete fetching & storing to the cache */}
  {/* only then it will read from the cache */}
  <Fetch url="https://api.example.com/data">{renderPageContent}</Fetch>

  {/* use ignoreCache prop to skip cache reading & always fetch fresh data from network */}
  <Fetch url="https://api.example.com/data" ignoreCache>{renderPageFooter}</Fetch>
</div>
```

### Complex fetching

Sometimes you want to do complex fetching mechanism such as polling. You cannot do that using render-prop without too many hacks. Thankfully, Fetch provides an escape hatch for this use case where you can access its resolver anytime conveniently. That said, you can go back to imperative style coding by extracting Fetch resolver:

```jsx
const fetchAPI = Fetch.defaults.resolver;

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

TODO

## Contributing

TODO