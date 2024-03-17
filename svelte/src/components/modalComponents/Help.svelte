<Modal id="help">
  <span slot="title">Help</span>

  <div slot="content">
    <fieldset>
      <legend>UI</legend>

      <section>
        <div>
          <h3>Set active pane</h3>

          <dl>
            <dt>t</dt>
            <dd>tracks</dd>

            <dt>⌘ b</dt>
            <dd>column browser</dd>

            <dt>⌘ f</dt>
            <dd>find box</dd>

            <dt>p</dt>
            <dd>playlists</dd>

            <dt>r</dt>
            <dd>releases</dd>

            <dt>/</dt>
            <dd>command bar</dd>

            <dt>?</dt>
            <dd>help</dd>
          </dl>
        </div>

        <div>
          <h3>Tracks pane</h3>

          <dl>
            <dt>⌘ a</dt>
            <dd>select all tracks</dd>

            <dt>⌘ e</dt>
            <dd>select tracks with same album as selected track</dd>

            <dt>⌘ i</dt>
            <dd>edit selected tracks</dd>

            <dt>⌘ p</dt>
            <dd>track parser</dd>

            <dt>⌘ r</dt>
            <dd>regex replace in tags</dd>

            <dt>⌘ g</dt>
            <dd>this tag/that tag</dd>

            <dt>⌫</dt>
            <dd>remove selected tracks from playlist</dd>

            <dt>⌘ ⌫</dt>
            <dd>delete selected tracks from library</dd>

            <dt>⌘^ ↑/↓</dt>
            <dd>move selected tracks up/down</dd>

            <dt>w</dt>
            <dd>toggle full width tracks table</dd>
          </dl>
        </div>

        <div>
          <h3>Playlists pane</h3>

          <dl>
            <dt>&lt;digit&gt;</dt>
            <dd>select playlist</dd>
          </dl>
        </div>
      </section>
    </fieldset>

    <fieldset>
      <legend>Playback</legend>

      <section>
        <div>
          <dl>
            <dt>⌘ enter</dt>
            <dd>start playing selected track/playlist</dd>

            <dt>⌘ space</dt>
            <dd>pause/resume</dd>

            <dt>⌘ s</dt>
            <dd>stop</dd>

            <dt>⌘ ←/→</dt>
            <dd>previous/next</dd>

            <dt>⌥ ←/→</dt>
            <dd>scrub -/+ 3 seconds</dd>
          </dl>
        </div>
      </section>
    </fieldset>
  </div>
</Modal>

<script lang="ts">
import Modal from './Modal.svelte';
</script>
