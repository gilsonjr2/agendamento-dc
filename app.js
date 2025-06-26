// app.js
document.addEventListener('DOMContentLoaded', () => {
    // Acessa as funções do Firebase que foram disponibilizadas no HTML
    const { db, collection, addDoc, onSnapshot, query, where } = window.firebase;

    // --- CONFIGURAÇÃO ---
    const ADMIN_WHATSAPP_NUMBER = '5524998147901';

    // --- ELEMENTOS DO DOM ---
    const datePicker = document.getElementById('date-picker');
    const prevDayBtn = document.getElementById('prev-day-btn');
    const nextDayBtn = document.getElementById('next-day-btn');
    const timeSlotsGrid = document.getElementById('time-slots-grid');
    const dayOfWeekDisplay = document.getElementById('day-of-week');
    
    // --- ELEMENTOS DO MODAL ---
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.querySelector('.close-btn');
    const bookingForm = document.getElementById('booking-form');
    const selectedSlotText = document.getElementById('selected-slot-text');
    let activeSlotId = null;
    let appointments = []; // Guarda a lista de agendamentos vinda do Firebase

    // --- FUNÇÕES DE DATA ---
    const getTodayString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseDateString = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    };

    const formatDateToString = (date) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDayName = (dateStr) => {
        const date = parseDateString(dateStr);
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return days[date.getUTCDay()];
    };

    // --- RENDERIZAÇÃO ---
    const generateTimeSlots = (selectedDateStr) => {
        timeSlotsGrid.innerHTML = '';
        const dayOfWeek = parseDateString(selectedDateStr).getUTCDay();
        dayOfWeekDisplay.textContent = getDayName(selectedDateStr);

        if (dayOfWeek === 0) { // Domingo
            timeSlotsGrid.innerHTML = '<p class="closed-message">Fechado aos domingos.</p>';
            return;
        }

        const startTime = 8;
        const endTime = 20;

        for (let hour = startTime; hour < endTime; hour++) {
            const time = `${String(hour).padStart(2, '0')}:00`;
            const slotId = `${selectedDateStr}T${time}`;
            const slotElement = document.createElement('div');
            slotElement.classList.add('time-slot');
            slotElement.textContent = time;
            slotElement.dataset.datetime = slotId;

            const isBooked = appointments.some(app => app.slotId === slotId && app.status === 'booked');
            const now = new Date();
            const slotDateTime = new Date(`${selectedDateStr}T${time}:00`);
            const isPast = now > slotDateTime;

            if (isPast) {
                 slotElement.classList.add('disabled');
            } else if (isBooked) {
                slotElement.classList.add('booked');
                slotElement.textContent = 'Reservado';
            } else {
                slotElement.classList.add('available');
                slotElement.addEventListener('click', () => openModal(slotId));
            }

            timeSlotsGrid.appendChild(slotElement);
        }
    };
    
    // --- LÓGICA DO FIREBASE ---
    const listenToAppointments = () => {
        const q = query(collection(db, "agendamentos"));
        onSnapshot(q, (querySnapshot) => {
            appointments = [];
            querySnapshot.forEach((doc) => {
                appointments.push({ id: doc.id, ...doc.data() });
            });
            // Re-renderiza os horários com os dados atualizados
            generateTimeSlots(datePicker.value);
        });
    };

    // --- LÓGICA DO MODAL ---
    const openModal = (slotId) => {
        activeSlotId = slotId;
        const [dateStr, time] = slotId.split('T');
        const formattedDate = parseDateString(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        selectedSlotText.textContent = `${formattedDate} às ${time}`;
        modal.style.display = 'block';
    };

    const closeModal = () => {
        modal.style.display = 'none';
        bookingForm.reset();
        activeSlotId = null;
    };

    // --- EVENT LISTENERS ---
    datePicker.addEventListener('change', () => generateTimeSlots(datePicker.value));

    prevDayBtn.addEventListener('click', () => {
        const currentDate = parseDateString(datePicker.value);
        currentDate.setUTCDate(currentDate.getUTCDate() - 1);
        datePicker.value = formatDateToString(currentDate);
        generateTimeSlots(datePicker.value);
    });

    nextDayBtn.addEventListener('click', () => {
        const currentDate = parseDateString(datePicker.value);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        datePicker.value = formatDateToString(currentDate);
        generateTimeSlots(datePicker.value);
    });
    
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const newAppointment = {
            slotId: activeSlotId,
            clientName: document.getElementById('client-name').value,
            clientPhone: document.getElementById('client-phone').value,
            carModel: document.getElementById('car-model').value,
            serviceType: document.getElementById('service-type').value,
            status: 'booked',
            createdAt: new Date()
        };

        const [dateStr, time] = activeSlotId.split('T');
        const formattedDate = parseDateString(dateStr).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

        const message = `*Novo Agendamento Recebido!*\n\n*Cliente:* ${newAppointment.clientName}\n*Telefone:* ${newAppointment.clientPhone}\n*Carro:* ${newAppointment.carModel}\n*Serviço:* ${newAppointment.serviceType}\n*Data:* ${formattedDate}\n*Hora:* ${time}`;
        const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappUrl, '_blank');
        
        alert('Redirecionando para o WhatsApp... Após enviar a mensagem, seu agendamento será confirmado.');

        try {
            await addDoc(collection(db, "agendamentos"), newAppointment);
            console.log("Agendamento salvo com sucesso no Firebase.");
        } catch (error) {
            console.error("Erro ao adicionar agendamento: ", error);
            alert("Ocorreu um erro ao salvar seu agendamento, mas a notificação foi enviada. Por favor, aguarde a confirmação manual.");
        } finally {
            closeModal();
            submitBtn.disabled = false;
        }
    });

    // --- INICIALIZAÇÃO ---
    const todayStr = getTodayString();
    datePicker.value = todayStr;
    datePicker.min = todayStr;
    listenToAppointments();
});
