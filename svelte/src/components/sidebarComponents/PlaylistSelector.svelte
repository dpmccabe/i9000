<Modal id="playlist-selector">
  <span slot="title">Playlists</span>

  <div slot="content">
    <OrganizedPlaylists />
  </div>
</Modal>

<script lang="ts">
import Modal from '../modalComponents/Modal.svelte';
import OrganizedPlaylists from './OrganizedPlaylists.svelte';
</script>
