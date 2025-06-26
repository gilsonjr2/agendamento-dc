// admin.js
document.addEventListener('DOMContentLoaded', () => {
    // Acessa as funções do Firebase que foram disponibilizadas no HTML
    const { db, collection, onSnapshot, doc, updateDoc, deleteDoc, query } = window.firebase;

    const appointmentsList = document.getElementById('appointments-list');
    const statusFilter = document.getElementById('status-filter');
    
    let allAppointments = []; // Guarda todos os agendamentos

    const renderAppointments = () => {
        appointmentsList.innerHTML = '';
        let filteredAppointments = [...allAppointments];
        const filterValue = statusFilter.value;

        if (filterValue !== 'all') {
            filteredAppointments = filteredAppointments.filter(app => app.status === filterValue);
        }

        if (filteredAppointments.length === 0) {
            appointmentsList.innerHTML = '<p>Nenhum agendamento encontrado para este filtro.</p>';
            return;
        }

        filteredAppointments.forEach(app => {
            const [dateStr, time] = app.slotId.split('T');
            const dateObj = new Date(dateStr + 'T00:00:00Z');
            const formattedDate = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

            const card = document.createElement('div');
            card.className = `appointment-card status-${app.status}`;
            
            card.innerHTML = `
                <h4>${app.serviceType} - ${formattedDate} às ${time}</h4>
                <p><strong>Cliente:</strong> ${app.clientName}</p>
                <p><strong>Telefone:</strong> ${app.clientPhone}</p>
                <p><strong>Carro:</strong> ${app.carModel}</p>
                <p><strong>Status:</strong> <span class="status-text">${app.status === 'booked' ? 'Agendado' : 'Concluído'}</span></p>
                <div class="card-actions">
                    <button class="conclude-btn" data-id="${app.id}" ${app.status === 'concluded' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i> Concluir Serviço
                    </button>
                    <button class="cancel-btn" data-id="${app.id}">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            `;
            
            appointmentsList.appendChild(card);
        });
        
        document.querySelectorAll('.conclude-btn').forEach(button => {
            button.addEventListener('click', concludeService);
        });
        document.querySelectorAll('.cancel-btn').forEach(button => {
            button.addEventListener('click', cancelService);
        });
    };
    
    const listenToAppointments = () => {
        const q = query(collection(db, "agendamentos"));
        onSnapshot(q, (querySnapshot) => {
            allAppointments = [];
            querySnapshot.forEach((doc) => {
                allAppointments.push({ id: doc.id, ...doc.data() });
            });
            // Ordena por data (mais recentes primeiro)
            allAppointments.sort((a, b) => new Date(b.createdAt.toDate()) - new Date(a.createdAt.toDate()));
            renderAppointments(); // Re-renderiza a lista com os dados atualizados
        });
    };

    const concludeService = async (e) => {
        const appointmentId = e.target.dataset.id;
        const appointmentRef = doc(db, "agendamentos", appointmentId);
        try {
            await updateDoc(appointmentRef, {
                status: "concluded"
            });
        } catch (error) {
            console.error("Erro ao concluir serviço: ", error);
            alert("Não foi possível concluir o serviço. Tente novamente.");
        }
    };

    const cancelService = async (e) => {
        const appointmentId = e.target.dataset.id;
        if (confirm('Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.')) {
            try {
                await deleteDoc(doc(db, "agendamentos", appointmentId));
            } catch (error) {
                console.error("Erro ao cancelar agendamento: ", error);
                alert("Não foi possível cancelar o agendamento. Tente novamente.");
            }
        }
    };
    
    statusFilter.addEventListener('change', renderAppointments);
    
    listenToAppointments(); // Começa a ouvir as atualizações do Firebase
});
