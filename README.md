# Summary

Declarative fetch in React with render prop & pluggable resolver.

# Basic example

```js
import { Futch } from 'futch';

// render
<Futch
  url="/v2/payment/wallet/summary"
>
  {fetchState => (
    <div>
      {fetchState.loading && <div>Loading...</div>}

      {fetchState.error && <div style={{ color: 'red' }}>{fetchState.error.message}</div>}

      {fetchState.response && <pre>{JSON.stringify(fetchState.response, null, 2)}</pre>}
    </div>
  )}
</Futch>
```

# Usage

Introducing `Futch`.

Futch is a React component that does data fetching (making API calls to backend) in a declarative manner. Futch is also:
1. State-framework-agnostic, i.e., no coupling with any state management library, just pure React component,
2. Data-fetching-library-agnostic, i.e., default (fetch) is provided but can be replaced with other libraries such as `axios`,
4. Able to abstract & encapsulate common fetching context, such as locale & client interface,
5. Easy to mock in test environment.

## Futch resolver
Axios is great! We merely need to borrow a couple of its design decision when it comes to exposing an API. Axios allows you to globally override their defaults by assigning them to your own custom defaults:
```js
import axios from 'axios';
import myCustomAxiosAdapter from './myCustomAxiosAdapter';

axios.defaults.adapter = myCustomAxiosAdapter;
```

This is good! Meaning, **we can provide defaults only once on app's boot time** and have fun later.

Can we do the same with Futch resolver? YES!
```js
import { Futch } from 'futch';

function customResolver() {
  return Promise.resolve('API RESPONSE');
}

Futch.defaults.resolver = customResolver;
```

Resolver has one and only one job that is to make API request given a set of parameters (e.g., url, body, headers, etc.), and give the response back as return / resolved values. Resolver is easy to mock because it's just a function that returns a Promise! So in tests, you should be able to write `Futch.defaults.resolver = () => Promise.resolve({ data: {...} });`. A big win :)

```js
// @flow
type Resolver = (url: string, data: Object, meta: Object) => Promise<any>;
```

## Futch Component

Futch is just another React component: you treat it, use it, test it just like one.

**Props**
```js
// @flow
type Props = {
  // required props
  children: (fetchState: State) => React.Node,
  url: string,

  // optional props
  data: any,
  defer: boolean,
  context: Object,
  method: 'GET' | 'POST',
  onComplete?: (response: any) => any,
  onError?: (error: Error) => any,
  onShowLoading?: () => any,
  onStartFetching?: () => any,
  prepare: (request: any) => any,
  process: (resoponse: any) => any,
  timeout?: number,
};
```
**GET Request**
```js
<Futch
  url="/v2/flight/search/oneway"
>
  {renderData}
</Futch>
```
**POST Request**
```js
<Futch
  url="/v2/flight/search/oneway"
  method="POST"
  data={{...}} // request payload
>
  {renderData}
</Futch>
```
**Adding Lifecycle Hooks to Perform Side Effects**
```js
<Futch
  url="/v2/flight/search/oneway"
  onShowLoading={displayPopUpGirl}
  onComplete={(data) => {
    hidePopUpGirl();
    saveDataToLocalStorage(data);
    redirectToNextPage();
  }}
>
  {renderData}
</Futch>
```
**Error Handling**
```js
<Futch
  url="/v2/flight/search/oneway"
  onError={(error) => {
    if (/network/i.test(error.message)) {
      showOfflineMessage();
    }
  }}
>
  {renderData}
</Futch>
```
**Using Render Prop**
Render prop exposes 3 properties: loading, error, response. **Do not perform any side effects here!** All side effects should only be performed on provided lifecycle hooks* (onError, onShowLoading, and onComplete).



_\*Exception: feel free to do so if using async mode (i.e., React Suspense)_
```js
function renderData({ loading, error, response }) {
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

<Futch
  url="/v2/flight/search/oneway"
>
  {renderData}
</Futch>
```
**Deferred Futch** 
Deferred / lazy fetch allows you to specify what triggers the fetch start event. If `defer` is specified, the render prop gets another property `trigger` that can be used as fetch triggering function. Use this when you don't want to start fetching immediately.
```js
<Futch
  url="/v2/flight/search/oneway"
  defer
>
  {fetch => (
    <div>
      <Button loading={fetch.loading} onClick={fetch.trigger}>Futch!</Button>
      <FlightSearchResultRenderer data={fetch.response} />
    </div>
  )}
</Futch>
```
**Advanced: Only Show Loading If Fetching Takes Longer Than 1s** 
```js
<Futch
  url="/v2/flight/search/oneway"
  timeout={1000} // 1 second
>
  {renderData}
</Futch>
```
**Advanced: Response Caching**
Caching API response should also be supported* (based on discussion with @zmihaf).

_\*url + payload hash will be used for cache keys_
```js
import { FutchCacheProvider } from 'futch';

// on top of your app
<FutchCacheProvider use="memory">
  <MyApp />
</FutchCacheProvider>

// on your app, you could have 2 or more identical Futch calls that are resolved from the cache, hitting network only if cache is empty.
<div>
  {/* first fetch will hit the network & store to the nearest provider */}
  <Futch url="/v2/payment/wallet/summary">{renderPageHeader}</Futch>

  {/* subsequent fetches will WAIT for the first resolver to complete fetching & storing to the cache */}
  {/* and read the data from cache */}
  <Futch url="/v2/payment/wallet/summary">{renderPageContent}</Futch>

  {/* use ignoreCache prop to skip cache reading & always fetch fresh data from network */}
  <Futch url="/v2/payment/wallet/summary" ignoreCache>{renderPageFooter}</Futch>
</div>

```
Props for FutchCacheProvider:
```js
// @flow
type Props = {
  use: 'memory' | 'localStorage',
};
```

# Drawbacks

Being declarative & using render prop in React comes with a couple of tradeoffs.

**Render-prop hell:**
```js
<RenderPropComponent {...config}>
  {resultOne => (
    <RenderPropComponent {...configTwo}>
      {resultTwo => (
        <RenderPropComponent {...configThree}>
          {resultThree => (
            <MyComponent results={{ resultOne, resultTwo, resultThree }} />
          )}
        </RenderPropComponent>
      )}
    </RenderPropComponent>
  )}
</RenderPropComponent>
```
But did you know: you can compose multiple render-prop components into one using [this library](https://github.com/pedronauck/react-adopt)?

**Complex Fetching**

Sometimes you want to do complex fetching mechanism such as polling. You cannot do that using render-prop without too many hacks. Thankfully, Futch provides an _escape hatch_ for this use case where you can access its resolver anytime conveniently. That said, you can go back to imperative style coding by extracting Futch resolver.
```js
const fetchAPI = Futch.defaults.resolver;

componentDidMount() {
  // start polling flight search
  this.poller = setInterval(async () => {
    const response = await fetchAPI(
      '/v2/flight/search/oneway',
      { data: {...}, method: 'POST' },
      { domain: 'flight' }
    );
    if (response.data.completed === true) {
      clearInterval(this.poller);
    }
  }, POLL_INTERVAL);
}
```

# Related projects

There are a few alternative libraries that do declarative data fetching too:
- https://github.com/CharlesMangwa/react-data-fetching
- https://github.com/tkh44/holen

But none of that supports pluggable resolver! 😞

# License

UNLICENSED