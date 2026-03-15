<script lang="ts">
  export let isOpen = false;
  export let title: string;
  export let onClose: () => void;
  export let onSave: () => void | Promise<void>;
  export let isSaving = false;
  export let saveButtonText = '保存する';
  export let cancelButtonText = 'キャンセル';
</script>

{#if isOpen}
  <div class="modal-overlay">
    <div class="modal-content">
      <h2>{title}</h2>
      <slot />

      <div class="modal-actions">
        <button class="btn cancel-btn" on:click={onClose} disabled={isSaving}>
          {cancelButtonText}
        </button>
        <button class="btn save-btn" on:click={onSave} disabled={isSaving}>
          {isSaving ? '保存中...' : saveButtonText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    backdrop-filter: blur(2px);
  }

  .modal-content {
    background: #fff;
    padding: 32px;
    border-radius: 16px;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    margin: 16px;
  }

  .modal-content h2 {
    margin: 0 0 24px 0;
    font-size: 1.4rem;
    color: #0f172a;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 32px;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .cancel-btn {
    background-color: #f1f5f9;
    color: #475569;
  }

  .cancel-btn:hover:not(:disabled) {
    background-color: #e2e8f0;
  }

  .save-btn {
    background-color: #2563eb;
    color: #fff;
  }

  .save-btn:hover:not(:disabled) {
    background-color: #1d4ed8;
  }
</style>
