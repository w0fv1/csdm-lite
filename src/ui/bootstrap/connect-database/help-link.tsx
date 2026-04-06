import React from 'react';
import { Trans } from '@lingui/react/macro';
import { ExternalLink } from 'csdm/ui/components/external-link';

function getDocumentationLink() {
  return `https://github.com/w0fv1/csdm-lite/blob/main/docs/fork-overview.md`;
}

export function HelpLink() {
  const docLink = getDocumentationLink();

  return (
    <p>
      <Trans>Please read the {<ExternalLink href={docLink}>documentation</ExternalLink>} for help.</Trans>
    </p>
  );
}
