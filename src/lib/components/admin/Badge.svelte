<script lang="ts">
  export let variant: 'title' | 'ai' | 'user' | 'ban' | 'ai-score' | 'likes' = 'user';
  export let text: string;
</script>

<span class="badge {variant}">{text}</span>

<style>
  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .title {
    background-color: #fef3c7;
    color: #d97706;
  }

  .ai {
    background-color: #dbeafe;
    color: #1d4ed8;
  }

  .user {
    background-color: #f1f5f9;
    color: #475569;
  }

  .ban {
    background-color: #ef4444;
    color: white;
    margin-left: 8px;
    font-size: 0.7rem;
  }

  .ai-score {
    background-color: #fef3c7;
    color: #d97706;
    padding: 4px 8px;
    border-radius: 6px;
    font-weight: 700;
    margin-bottom: 4px;
    margin-right: 4px;
  }

  .likes {
    background-color: #fee2e2;
    color: #ef4444;
    padding: 4px 8px;
    border-radius: 6px;
    font-weight: 700;
    margin-bottom: 4px;
    margin-right: 4px;
  }
</style>
