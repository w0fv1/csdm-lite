import React from 'react';
import { Trans } from '@lingui/react/macro';
import { useDatabaseSettings } from './use-database-settings';
import { TextInput } from 'csdm/ui/components/inputs/text-input';
import { RevealFileInExplorerButton } from 'csdm/ui/components/buttons/reveal-file-in-explorer-button';

export function Database() {
  const { filePath } = useDatabaseSettings();

  return (
    <div className="flex max-w-[420px] flex-col gap-y-8">
      <TextInput label={<Trans>Database file</Trans>} value={filePath} isReadOnly={true} />
      <div className="flex gap-x-8">
        <RevealFileInExplorerButton path={filePath} />
      </div>
    </div>
  );
}
