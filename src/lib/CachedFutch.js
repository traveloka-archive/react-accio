// @flow
import * as React from 'react';

import Futch, { type Props } from './Futch';
import hoistStatics from 'hoist-non-react-statics';

import { FutchCacheConsumer, type FutchCache } from './FutchCacheContext';

class CachedFutch extends React.Component<Props> {
  renderChild(_cache: FutchCache) {
    const { children, ...props } = this.props;
    return (
      <Futch {...props} _cache={_cache}>
        {children}
      </Futch>
    );
  }

  render() {
    return <FutchCacheConsumer>{this.renderChild.bind(this)}</FutchCacheConsumer>;
  }
}

hoistStatics(CachedFutch, Futch);

export default CachedFutch;
