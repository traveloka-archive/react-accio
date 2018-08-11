// @flow
import * as React from 'react';

import Accio, { type Props } from './Accio';
import hoistStatics from 'hoist-non-react-statics';

import { AccioCacheConsumer, type AccioCache } from './AccioCacheContext';

class CachedAccio extends React.Component<Props> {
  renderChild(_cache: AccioCache) {
    const { children, forwardedRef, ...props } = this.props;
    return (
      <Accio {...props} ref={forwardedRef} _cache={_cache}>
        {children}
      </Accio>
    );
  }

  render() {
    return (
      <AccioCacheConsumer>{this.renderChild.bind(this)}</AccioCacheConsumer>
    );
  }
}

// $FlowFixMe https://github.com/facebook/flow/issues/6103
const CachedAccioWithRef = React.forwardRef((props, ref) => (
  <CachedAccio {...props} forwardedRef={ref} />
));

hoistStatics(CachedAccioWithRef, Accio);

export default CachedAccioWithRef;
