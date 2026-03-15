<script lang="ts">
  export let label: string;
  export let id: string;
  export let danger = false;
</script>

<div class="form-group" class:danger-zone={danger}>
  <label for={id}>{label}</label>
  <slot />
</div>

<style>
  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #475569;
    margin-bottom: 8px;
  }

  .form-group :global(input),
  .form-group :global(textarea) {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  .form-group :global(textarea) {
    resize: vertical;
    font-family: inherit;
  }

  .form-group :global(input:focus),
  .form-group :global(textarea:focus) {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .danger-zone {
    margin-top: 24px;
    padding: 16px;
    border: 2px dashed #ef4444;
    border-radius: 8px;
    background-color: #fef2f2;
  }

  .danger-zone label {
    color: #ef4444;
  }
</style>
