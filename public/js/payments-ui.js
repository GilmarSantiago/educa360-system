
async function openPayModal(paymentId, studentId) {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/payments/${paymentId}`, { headers: { 'Authorization': `Bearer ${token}` }});
    const data = await res.json();
    
    if (!data.success) return;
    const p = data.payment;

    // Mora Calculation
    const dueDate = new Date(p.dueDate);
    const now = new Date();
    let lateFee = 0;
    
    if (now > dueDate) {
        const diffTime = Math.abs(now - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Example: S/ 2.00 per day late
        lateFee = diffDays * 2;
    }

    const configRes = await fetch('/api/school', { headers: { 'Authorization': `Bearer ${token}` } });
    const configData = await configRes.json();
    const paymentMethods = (configData.success && configData.school.paymentMethods) ? configData.school.paymentMethods : ['Efectivo', 'Yape / Plin', 'Transferencia', 'Tarjeta'];
    
    const methodOptions = paymentMethods.map(m => `<option value="${m}">${m}</option>`).join('');

    const bodyHtml = `
        <div class="text-start">
            <div class="alert alert-info border-0 rounded-4 mb-4 small">
                <i class="fas fa-info-circle me-2"></i> Procesando el pago para: <br>
                <strong class="text-dark">${p.concept}</strong>
            </div>

            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold">MONTO BASE (S/)</label>
                    <div class="form-control rounded-pill bg-light border-0 px-3 fw-bold text-dark">S/ ${p.amount.toFixed(2)}</div>
                </div>
                <div class="col-md-6">
                    <label class="form-label text-muted small fw-bold text-danger">MORA CALCULADA (S/)</label>
                    <input type="number" id="pay_late_fee" class="form-control rounded-pill bg-danger bg-opacity-10 border-0 px-3 fw-bold text-danger" value="${lateFee.toFixed(2)}" ${lateFee === 0 ? 'disabled' : ''}>
                </div>
                
                ${lateFee > 0 ? `
                <div class="col-12">
                    <div class="form-check form-switch bg-light p-3 rounded-4 border">
                        <input class="form-check-input ms-0 me-2" type="checkbox" id="waive_late_fee" onchange="toggleLateFee(this)">
                        <label class="form-check-label text-muted small fw-bold" for="waive_late_fee">EXONERAR MORA / MULTA</label>
                    </div>
                </div>
                ` : ''}

                <div class="col-12 mt-3">
                    <label class="form-label text-muted small fw-bold">MÉTODO DE PAGO</label>
                    <select id="pay_method" class="form-select rounded-pill bg-light border-0 px-3 fw-bold">
                        ${methodOptions}
                    </select>
                </div>

                <div class="col-12 mt-4 text-center">
                    <div class="p-3 rounded-4 bg-primary bg-opacity-10 border border-primary border-dashed">
                        <small class="text-muted d-block fw-bold mb-1 uppercase">TOTAL A PAGAR</small>
                        <h3 class="fw-bold text-primary mb-0" id="pay_total_display">S/ ${(p.amount + lateFee).toFixed(2)}</h3>
                    </div>
                </div>
            </div>
        </div>
    `;

    const payModal = Swal.fire({
        title: `<div class="text-start fs-5 fw-bold text-dark w-100"><i class="fas fa-money-bill-wave me-2 text-success"></i>Registrar Pago</div>`,
        html: bodyHtml,
        width: '450px',
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-check-circle me-2"></i> Procesar Pago',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        customClass: { popup: 'rounded-4 border-0 shadow-lg', confirmButton: 'rounded-pill px-4 py-2', cancelButton: 'rounded-pill px-4' },
        didOpen: () => {
            window._basePayAmount = p.amount;
        }
    });

    payModal.then(async (result) => {
        if (result.isConfirmed) {
            const method = document.getElementById('pay_method').value;
            const lateFeeVal = parseFloat(document.getElementById('pay_late_fee')?.value || 0);
            const waiveLateFee = document.getElementById('waive_late_fee')?.checked || false;

            const resPay = await fetch(`/api/payments/${paymentId}/pay`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ method, lateFee: lateFeeVal, waiveLateFee })
            });
            const dataPay = await resPay.json();
            
            if (dataPay.success) {
                showToast('success', 'Pago registrado correctamente');
                // Refresh folder data (we need to re-fetch the student folder data)
                const resFolder = await fetch(`/api/enrollments/folder/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` }});
                const dataFolder = await resFolder.json();
                if (dataFolder.success) {
                    window._folderPayments = dataFolder.data.payments;
                    updateFolderPayments(studentId, _folderPaymentsPage);
                }
            } else {
                if (dataPay.message && dataPay.message.includes('caja')) {
                    Swal.fire('Atención', dataPay.message, 'warning');
                } else {
                    showToast('error', dataPay.message || 'Error al procesar pago');
                }
            }
        }
    });
}

window.toggleLateFee = function(checkbox) {
    const lateInput = document.getElementById('pay_late_fee');
    const totalDisplay = document.getElementById('pay_total_display');
    const lateFee = checkbox.checked ? 0 : parseFloat(lateInput.defaultValue || 0);
    
    lateInput.value = lateFee.toFixed(2);
    const total = window._basePayAmount + lateFee;
    totalDisplay.innerText = `S/ ${total.toFixed(2)}`;
    
    if (checkbox.checked) {
        lateInput.classList.add('text-decoration-line-through');
        lateInput.disabled = true;
    } else {
        lateInput.classList.remove('text-decoration-line-through');
        lateInput.disabled = false;
    }
};
