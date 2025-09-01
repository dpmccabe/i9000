<div id="relationships-container">
  <Tab
    tabTitle="Relationships"
    tabId="relationships"
    onMountFn="{() => {
      relationshipSettings.set(new RelationshipSettings());
    }}"
    getNextResultsBatch="{() => getNextRelationshipResultsBatch()}"
    bind:settings="{$relationshipSettings}"
    results="{$relationshipResults}"
    fields="{relationshipFields}"
    rowComponent="{RelationshipRow}" />
</div>

<script lang="ts">
import { onDestroy, onMount, tick } from 'svelte';
import {
  getNextRelationshipResultsBatch,
  relationshipFields,
  relationshipResults,
  RelationshipSettings,
  relationshipSettings,
  nNewRelationships,
  getNNewRelationships,
  statsContent,
} from '../../internal';
import Tab from '../Tab.svelte';
import RelationshipRow from './RelationshipRow.svelte';

$: {
  statsContent.set($relationshipResults?.statsContent ?? '');
}

onMount(async (): Promise<void> => {
  nNewRelationships.set(await getNNewRelationships());
});

onDestroy((): void => {
  setTimeout((): void => {
    void (async (): Promise<void> => {
      await tick();
      relationshipSettings.set(undefined);
    })();
  });
});
</script>

<style lang="scss" global>
@use '../../assets/colors';
@use '../../assets/dims';

#relationships-container > table.tab {
  td,
  th {
    min-width: 5em;

    &.acked {
      width: 5em;
    }

    &.type {
      width: 15em;
    }

    &.created-at {
      width: 8em;
    }
  }

  td {
    .actions {
      display: flex;
      flex-direction: row;

      a {
        color: colors.$gray-text;
        padding: 5px;
        font-size: 11px;

        @media (hover: hover) {
          &:hover {
            color: white;
          }
        }
      }

       a.true {
        color: #8bc34a;
      }
    }

    .type {
      span {
        white-space: nowrap;
        display: inline-block;
        padding: 0 5px;
        margin-right: 5px;
        background-color: #999;
        color: colors.$dark-gray;
        border-radius: 5px;

        @for $i from 1 through length(colors.$relationship-types) {
          &.#{nth(colors.$relationship-types, $i)} {
            background-color: #{nth(colors.$relationship-type-colors, $i)};
          }
        }
      }
    }

    a:not([role='button']) {
      color: colors.$gray-text;
      text-decoration: none;

      @media (hover: hover) {
        &:hover {
          color: white;
        }
      }

      &.lastfm {
        color: #fbb4ae;
        display: inline-block;
        margin: 0 2px;

        @media (hover: hover) {
          &:hover {
            color: white;
          }
        }
      }

      &.copy {
        display: inline-block;
        margin: 0 2px;

        @media (hover: hover) {
          &:hover {
            color: white;
          }
        }
      }
    }
  }

  @media screen and (max-width: dims.$mobile-cutoff) {
    tbody tr td .actions {
      padding: 10px;
    }
  }
}
</style>
