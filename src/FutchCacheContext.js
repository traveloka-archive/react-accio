// @flow
import * as React from 'react';

type StorageType = 'memory' | 'localStorage';

export type FutchCache = Map<string, any> | Object;

type Props = {
  children: React.Node,
  use: StorageType,
};

const { Provider, Consumer } = React.createContext(null);

function configureCache(type: StorageType): FutchCache {
  if (type === 'memory') {
    return new Map();
  }
  if (type === 'localStorage') {
    throw new Error('Local storage cache support is incomplete. Please use memory in the meantime.');
  }
  throw new Error('Unknown FutchCache storage type :/');
}

export class FutchCacheProvider extends React.Component<Props> {
  static defaultProps = {
    use: 'memory',
  };

  cache: FutchCache = configureCache(this.props.use);

  render() {
    return <Provider value={this.cache}>{this.props.children}</Provider>;
  }
}

export const FutchCacheConsumer = Consumer;
