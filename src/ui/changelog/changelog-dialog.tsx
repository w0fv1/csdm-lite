import React, { useEffect, useState } from 'react';
import { Trans } from '@lingui/react/macro';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import rehypeExternalLinks from 'rehype-external-links';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from 'csdm/ui/dialogs/dialog';
import { useDialog } from 'csdm/ui/components/dialogs/use-dialog';
import { CloseButton } from 'csdm/ui/components/buttons/close-button';
import { ExternalLink } from 'csdm/ui/components/external-link';
import { Donate } from 'csdm/ui/components/donate';
import { Status } from 'csdm/common/types/status';
import { Spinner } from 'csdm/ui/components/spinner';
import { getReleaseApiUrl, getReleaseTagUrl, RELEASES_URL, REPOSITORY_URL } from 'csdm/common/urls';

function directiveStylingPlugin() {
  return function (tree: Root) {
    visit(tree, function (node) {
      if (node.type === 'containerDirective') {
        const data = node.data ?? (node.data = {});
        data.hName = 'div';
        switch (node.name) {
          case 'warning':
            data.hProperties = { className: 'directive warning' };
            break;
          case 'info':
            data.hProperties = { className: 'directive info' };
            break;
          case 'danger':
            data.hProperties = { className: 'directive danger' };
            break;
        }
      }
    });
  };
}

async function markdownToHtml(markdown: string) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(directiveStylingPlugin)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeExternalLinks, { rel: ['noopener', 'noreferrer'], target: '_blank' })
    .use(rehypeStringify);

  const file = await processor.process(markdown);

  return String(file);
}

export function ChangelogDialog() {
  const { hideDialog } = useDialog();
  const [status, setStatus] = useState<Status>(Status.Loading);
  const [html, setHtml] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(getReleaseApiUrl(APP_VERSION), {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'csdm-lite',
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch release notes with status ${response.status}`);
        }

        const release = (await response.json()) as { body?: string };
        const markdown = release.body?.trim();
        if (!markdown) {
          throw new Error(`No release notes found for version ${APP_VERSION}`);
        }
        setHtml(await markdownToHtml(markdown));
        setStatus(Status.Success);
      } catch (error) {
        logger.log('Failed to fetch changelog');
        logger.error(error);
        try {
          const fallbackMarkdown = [
            '# Release notes',
            '',
            'Release notes for this fork are published on GitHub Releases.',
            '',
            `- Current version: \`${APP_VERSION}\``,
            `- Repository: ${REPOSITORY_URL}`,
            `- Releases: ${RELEASES_URL}`,
            '',
            'If release notes are not available yet, the current build may not have been published on GitHub Releases.',
          ].join('\n');
          setHtml(await markdownToHtml(fallbackMarkdown));
          setStatus(Status.Success);
        } catch (fallbackError) {
          logger.log('Failed to render fallback changelog');
          logger.error(fallbackError);
          setStatus(Status.Error);
        }
      }
    })();
  }, []);

  const renderChangelog = () => {
    if (status === Status.Loading) {
      return (
        <div className="flex h-[120px] items-center justify-center self-center">
          <Spinner size={48} />
        </div>
      );
    }

    if (status === Status.Error) {
      return (
        <p className="text-body-strong">
          <Trans>Failed to load changelog.</Trans>
        </p>
      );
    }

    return <div className="changelog" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>
          <Trans>Changelog version {APP_VERSION}</Trans>
        </DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="flex max-w-[700px] flex-col gap-y-16 **:select-text">
          {renderChangelog()}
          <Donate />
        </div>
      </DialogContent>
      <DialogFooter>
        <ExternalLink href={getReleaseTagUrl(APP_VERSION)}>
          <Trans>View release notes</Trans>
        </ExternalLink>
        <ExternalLink href={RELEASES_URL}>
          <Trans>View releases</Trans>
        </ExternalLink>
        <CloseButton onClick={hideDialog} />
      </DialogFooter>
    </Dialog>
  );
}
