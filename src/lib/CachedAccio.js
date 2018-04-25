// @flow
import * as React from 'react';

import Accio, { type Props } from './Accio';
import hoistStatics from 'hoist-non-react-statics';

import { AccioCacheConsumer, type AccioCache } from './AccioCacheContext';

class CachedAccio extends React.Component<Props> {
  renderChild(_cache: AccioCache) {
    const { children, ...props } = this.props;
    return (
      <Accio {...props} _cache={_cache}>
        {children}
      </Accio>
    );
  }

  render() {
    return <AccioCacheConsumer>{this.renderChild.bind(this)}</AccioCacheConsumer>;
  }
}

hoistStatics(CachedAccio, Accio);

export default CachedAccio;
