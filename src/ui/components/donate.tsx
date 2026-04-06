import React from 'react';
import { Trans } from '@lingui/react/macro';
import { ExternalLink } from './external-link';

export function Donate() {
  return (
    <div className="flex flex-col">
      <h3 className="text-subtitle">
        <Trans>Support</Trans>
      </h3>
      <p>
        <Trans>
          CS Demo Manager Lite is a community-maintained SQLite fork of the original CS Demo Manager project.
        </Trans>
      </p>
      <p>
        <Trans>
          The original project was created and maintained upstream, and this fork focuses on keeping a lightweight
          local SQLite workflow available.
        </Trans>
      </p>
      <p>
        <Trans>
          The best way to support this fork right now is to file issues, test releases, and contribute improvements on{' '}
          <ExternalLink href="https://github.com/w0fv1/csdm-lite">GitHub</ExternalLink>.
        </Trans>
      </p>
    </div>
  );
}
