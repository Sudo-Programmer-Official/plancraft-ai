async function saveBatchTasks() {
  if (!generatedTasks.value.length) return;

  loading.value = true;
  try {
    // Prepare user preferences for notifications
    const uid = authStore?.user?.uid;
    const prefs = userPrefs.value?.notifications || {};
    const tz = getUserTimezone();
    const chans = [
      prefs?.whatsapp && 'whatsapp',
      (prefs?.pwa || prefs?.push) && 'pwa',
      prefs?.email && 'email',
      prefs?.sms && 'sms',
      prefs?.voice_call && 'voice_call',
    ].filter(Boolean);

    // Gentle prompt if user hasn't configured any channel yet
    if (!hasNotificationSetup(prefs)) {
      notifPromptOpen.value = true;
      suppressAutoClose.value = true;
    }

    // Create batch payloads for tasks and reminders
    const taskPromises = generatedTasks.value.map(async (task, index) => {
      const newTask = {
        title: task.title,
        details: task.details || '',
        link: '',
        completed: false,
        date: selectedDate.value,
        order: tasks.value.length + index,
        logs: [],
        reminderTime: dayjs(task.scheduledTime).format('HH:mm')
      };

      const saved = await addTaskToFirebase(newTask);

      if (uid && saved?.id && task.scheduledTime) {
        return {
          text: newTask.title,
          scheduledTime: task.scheduledTime,
          taskId: saved.id,
          channels: chans.length ? chans : undefined,
          timezone: tz,
          timeInfo: task.time || null
        };
      }
    });

    const reminderPayloads = (await Promise.all(taskPromises))
      .filter(Boolean);

    // Schedule all reminders as a batch
    if (reminderPayloads.length) {
      await api.post('/reminders/batch', {
        reminders: reminderPayloads
      });
    }

    ElNotification({
      title: 'Success',
      message: `Created ${generatedTasks.value.length} tasks`,
      type: 'success'
    });

    emit('saved');
    closeDialog();

  } catch (error) {
    console.error('Failed to save tasks:', error);
    ElNotification({
      title: 'Error',
      message: 'Failed to save tasks',
      type: 'error'
    });
  } finally {
    loading.value = false;
  }
}