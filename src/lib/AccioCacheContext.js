// @flow
import * as React from 'react';

type StorageType = 'memory' | 'localStorage';

export type AccioCache = Map<string, any> | Object;

type Props = {
  children: React.Node,
  use: StorageType,
};

// $FlowFixMe
const { Provider, Consumer } = React.createContext(null);

function configureCache(type: StorageType): AccioCache {
  if (type === 'memory') {
    return new Map();
  }
  if (type === 'localStorage') {
    throw new Error('Local storage cache support is incomplete. Please use memory in the meantime.');
  }
  throw new Error('Unknown AccioCache storage type :/');
}

export class AccioCacheProvider extends React.Component<Props> {
  static defaultProps = {
    use: 'memory',
  };

  cache: AccioCache = configureCache(this.props.use);

  render() {
    return <Provider value={this.cache}>{this.props.children}</Provider>;
  }
}

export const AccioCacheConsumer = Consumer;
