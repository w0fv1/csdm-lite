import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plural, Trans } from '@lingui/react/macro';
import { useDispatch } from 'csdm/ui/store/use-dispatch';
import { ConnectDatabaseButton } from 'csdm/ui/bootstrap/connect-database/connect-database-button';
import { HelpLink } from './help-link';
import { useWebSocketClient } from 'csdm/ui/hooks/use-web-socket-client';
import { useDatabaseSettings } from 'csdm/ui/settings/database/use-database-settings';
import { AppWrapper } from '../app-wrapper';
import { AppContent } from '../app-content';
import { connectDatabaseError, connectDatabaseSuccess } from '../bootstrap-actions';
import { RendererClientMessageName } from 'csdm/server/renderer-client-message-name';
import { useBootstrapState } from '../use-bootstrap-state';
import type { ConnectDatabaseError } from 'csdm/server/handlers/renderer-process/database/connect-database-handler';
import { ErrorCode } from 'csdm/common/error-code';
import { useArgument } from '../use-argument';
import { ArgumentName } from 'csdm/common/argument/argument-name';
import { CancelButton } from 'csdm/ui/components/buttons/cancel-button';
import { ErrorMessage } from 'csdm/ui/components/error-message';
import { ButtonVariant } from 'csdm/ui/components/buttons/button';
import { ResetDatabaseButton } from 'csdm/ui/settings/database/reset-database-button';
import { TextInput } from 'csdm/ui/components/inputs/text-input';

function DatabaseSchemaVersionMismatch() {
  return (
    <div>
      <p>
        <Trans>
          It looks like you installed an older version of CS Demo Manager Lite and the current database schema is not
          compatible with it.
        </Trans>
      </p>
      <p>
        <Trans>
          You can either update CS Demo Manager Lite to the latest version or reset the database to start from scratch.
        </Trans>
      </p>

      <div className="mt-8">
        <ResetDatabaseButton variant={ButtonVariant.Danger} />
      </div>
    </div>
  );
}

function getHintFromError({ code, message }: ConnectDatabaseError) {
  switch (code) {
    case ErrorCode.DatabaseSchemaVersionMismatch:
      return <DatabaseSchemaVersionMismatch />;
  }

  if (message.includes('ECONNREFUSED')) {
    return (
      <p>
        <Trans>
          This error usually means that the local database could not be opened yet.
        </Trans>
      </p>
    );
  }

  return (
    <p>
      <Trans>Make sure the SQLite database file is accessible and your settings are correct.</Trans>
    </p>
  );
}

export function ConnectDatabase() {
  const client = useWebSocketClient();
  const dispatch = useDispatch();
  const { filePath } = useDatabaseSettings();
  const { error } = useBootstrapState();
  const [isConnecting, setIsConnecting] = useState(false);
  const [secondsBeforeNextTry, setSecondsBeforeNextTry] = useState(-1);
  const animationId = useRef<number | null>(null);
  const appOpenedAtLoginArg = useArgument(ArgumentName.AppOpenedAtLogin);

  const stopRetrying = () => {
    if (animationId.current !== null) {
      window.cancelAnimationFrame(animationId.current);
    }
    setSecondsBeforeNextTry(-1);
  };

  const connectDatabase = useCallback(async () => {
    stopRetrying();
    setIsConnecting(true);
    const error = await client.send({
      name: RendererClientMessageName.ConnectDatabase,
      payload: undefined,
    });
    if (error) {
      setIsConnecting(false);
      dispatch(connectDatabaseError({ error }));
    } else {
      dispatch(connectDatabaseSuccess());
    }

    return error;
  }, [client, dispatch]);

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.stopPropagation();
        await connectDatabase();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  useEffect(() => {
    if (appOpenedAtLoginArg !== 'true') {
      return;
    }

    const delayInMs = 10_000;
    let start: number | null = null;
    const loop = async (time: number) => {
      if (start === null) {
        start = time;
      }

      const elapsed = time - start;
      if (elapsed >= delayInMs) {
        start = null;
        const error = await connectDatabase();
        if (error) {
          animationId.current = window.requestAnimationFrame(loop);
        }
      } else {
        const seconds = Math.round((delayInMs - elapsed) / 1000);
        setSecondsBeforeNextTry(seconds);
        animationId.current = window.requestAnimationFrame(loop);
      }
    };

    animationId.current = window.requestAnimationFrame(loop);

    return () => {
      stopRetrying();
    };
  }, [appOpenedAtLoginArg, connectDatabase]);

  const renderError = () => {
    if (!error) {
      return null;
    }

    const hint = getHintFromError(error);
    return (
      <div className="m-auto mt-8 flex max-w-[600px] flex-col">
        <ErrorMessage message={<Trans>Opening the local database failed with the following error:</Trans>} />
        <p className="my-8 text-body-strong select-text">{error.message}</p>
        {hint}
      </div>
    );
  };

  return (
    <AppWrapper>
      <AppContent>
        <div className="m-auto flex flex-col">
          <div className="m-auto flex w-[400px] flex-col">
            <div>
              <p>
                <Trans>CS Demo Manager Lite opens its local SQLite database automatically.</Trans>
              </p>
              <HelpLink />
            </div>
            <div className="mt-12 flex flex-col gap-12">
              <TextInput label={<Trans>Database file</Trans>} value={filePath} isReadOnly={true} />
              <div className="flex items-center justify-between">
                <ConnectDatabaseButton isLoading={isConnecting} onClick={connectDatabase} />
                {secondsBeforeNextTry > 0 && (
                  <div className="flex items-center gap-x-8">
                    <p>
                      <Plural value={secondsBeforeNextTry} one="Retrying in # second…" other="Retrying in # seconds…" />
                    </p>
                    <CancelButton onClick={stopRetrying} />
                  </div>
                )}
              </div>
            </div>
          </div>
          {renderError()}
        </div>
      </AppContent>
    </AppWrapper>
  );
}
