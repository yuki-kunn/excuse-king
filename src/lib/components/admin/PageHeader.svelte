<script lang="ts">
  export let title: string;
  export let description: string;
</script>

<div class="page-header-row">
  <div class="page-header">
    <h1 class="page-title">{title}</h1>
    <p class="page-description">{description}</p>
  </div>

  <slot name="actions" />
</div>

<style>
  .page-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .page-header {
    margin: 0;
  }

  .page-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px 0;
  }

  .page-description {
    color: #64748b;
    margin: 0;
    font-size: 0.95rem;
  }

  @media (max-width: 768px) {
    .page-header-row {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
      margin-bottom: 24px;
    }

    .page-title {
      font-size: 1.5rem;
    }
  }
</style>
