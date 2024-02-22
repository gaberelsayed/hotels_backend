const moment = require("moment-timezone");

const confirmationEmail = (reservationData) => {
	// Convert dates to Saudi Arabia time zone
	const checkinDateSaudi = moment(reservationData.checkin_date)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");
	const checkoutDateSaudi = moment(reservationData.checkout_date)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");
	const bookedAtSaudi = moment(reservationData.booked_at)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");

	const checkinDate = moment(reservationData.checkin_date).tz("Asia/Riyadh");
	const checkoutDate = moment(reservationData.checkout_date).tz("Asia/Riyadh");

	const nightsOfResidence = checkoutDate.diff(checkinDate, "days");

	const email = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reservation Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #c5ddf6; }
            .container { background-color: #fff; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6f61; color: white; padding: 10px; text-align: center; }
            .content { padding-right: 20px; padding-left: 20px; text-align: left; }
            .footer { background: #ddd; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; }
            .roomType { font-weight: bold; text-transform: capitalize; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #ff6f61; color: white; }
            h2 { font-weight: bold; font-size: 1.5rem; }
            strong { font-weight: bold; }
            .confirmation {
                font-size: 1rem;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Reservation</h1>
            </div>
            <div>
                <h2>${reservationData.hotelName.toUpperCase()} Hotel</h2>
            </div>
            <div class="content">
            <p class="confirmation"><strong>Confirmation Number:</strong> ${
							reservationData.confirmation_number
						}</p>
                <p><strong>Guest Name:</strong> ${
									reservationData.customer_details.name
								}</p>
                <p><strong>Reservation Status:</strong> ${
									reservationData.reservation_status
								}</p>
                <p><strong>Country:</strong> ${
									reservationData.customer_details.nationality
								}</p>
                <table>
                    <tr>
                        <th>Room Type</th>
                        <td class="roomType">${reservationData.pickedRoomsType
													.map((room) => room.room_type)
													.join(", ")}</td>
                    </tr>
                    <tr>
                        <th>Room Count</th>
                        <td class="roomType">${reservationData.pickedRoomsType.reduce(
													(sum, item) => sum + (item.count || 0),
													0
												)}</td>
                    </tr>
                    <tr>
                        <th>Check-in Date</th>
                        <td>${checkinDateSaudi}</td>
                    </tr>
                    <tr>
                        <th>Check-out Date</th>
                        <td>${checkoutDateSaudi}</td>
                    </tr>
                    <tr>
                        <th>Nights Of Residence</th>
                        <td>${nightsOfResidence} Nights</td>
                    </tr>
                    <tr>
                        <th>Guest Count</th>
                        <td>${reservationData.total_guests}</td>
                    </tr>
                    <tr>
                        <th>Payment Status</th>
                        <td>${reservationData.payment}</td>
                    </tr>
                    <tr>
                    <th>Paid Amount</th>
                    <td>${reservationData.paid_amount}</td>
                    </tr>

                    <tr>
                        <th>Order Total</th>
                        <td>${reservationData.total_amount.toLocaleString()} SAR</td>
                    </tr>
                    <tr>
                     <th>Amount Due</th>
                    <td>${Number(
											Number(reservationData.total_amount) -
												Number(reservationData.paid_amount)
										).toLocaleString()}</td>
                    </tr>
                </table>
                <p><strong>Booking Date:</strong> ${bookedAtSaudi}</p>
            </div>
            <div class="footer">
                <p>Thank you for booking with us!</p>
            </div>
        </div>
    </body>
    </html>
    `;

	return email;
};

const reservationUpdate = (reservationData, hotelName) => {
	// Convert dates to Saudi Arabia time zone
	const checkinDateSaudi = moment(reservationData.checkin_date)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");
	const checkoutDateSaudi = moment(reservationData.checkout_date)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");
	const bookedAtSaudi = moment(reservationData.booked_at)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");

	const checkinDate = moment(reservationData.checkin_date).tz("Asia/Riyadh");
	const checkoutDate = moment(reservationData.checkout_date).tz("Asia/Riyadh");

	const nightsOfResidence = checkoutDate.diff(checkinDate, "days");

	const email = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reservation Confirmation Update</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #c5ddf6; }
            .container { background-color: #fff; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6f61; color: white; padding: 10px; text-align: center; }
            .content { padding-right: 20px; padding-left: 20px; text-align: left; }
            .footer { background: #ddd; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; }
            .roomType { font-weight: bold; text-transform: capitalize; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #ff6f61; color: white; }
            h2 { font-weight: bold; font-size: 1.5rem; }
            strong { font-weight: bold; }
            .confirmation {
                font-size: 1rem;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
    <div class="container">
        <div class="header">
            <h1>Reservation Update</h1>
        </div>
        <div>
            <h2>${hotelName.toUpperCase()} Hotel</h2>
        </div>
        <div class="content">
        <p class="confirmation"><strong>Confirmation Number:</strong> ${
					reservationData.confirmation_number
				}</p>
            <p><strong>Guest Name:</strong> ${
							reservationData.customer_details.name
						}</p>
          
                        <p><strong>Reservation Status:</strong> ${
													reservationData.reservation_status
												}</p>
            <p><strong>Country:</strong> ${
							reservationData.customer_details.nationality
						}</p>
            <table>
                <tr>
                    <th>Room Type</th>
                    <td class="roomType">${reservationData.pickedRoomsType
											.map((room) => room.room_type)
											.join(", ")}</td>
                </tr>
               
                <tr>
                <th>Room Count</th>
                <td class="roomType">${reservationData.pickedRoomsType.reduce(
									(sum, item) => sum + (item.count || 0),
									0
								)}</td>
                </tr>
                
                <tr>
                <th>Check-in Date</th>
                <td>${checkinDateSaudi}</td>
            </tr>
            <tr>
                <th>Check-out Date</th>
                <td>${checkoutDateSaudi}</td>
            </tr>
                <tr>
                <th>Nights Of Residence</th>
                <td>${nightsOfResidence} Nights</td>
            </tr>
            <tr>
                <th>Guest Count</th>
                <td>${reservationData.total_guests}</td>
            </tr>
            <tr>
                <th>Payment Status</th>
                <td>${reservationData.payment}</td>
            </tr>
            <th>Paid Amount</th>
            <td>${reservationData.paid_amount}</td>
            </tr>
                <tr>
                    <th>Order Total</th>
                    <td>${reservationData.total_amount.toLocaleString()} SAR</td>
                </tr>
                <tr>
                <th>Amount Due</th>
               <td>${Number(
									Number(reservationData.total_amount) -
										Number(reservationData.paid_amount)
								).toLocaleString()}</td>
               </tr>
            </table>
            <p><strong>Booking Date:</strong> ${bookedAtSaudi}</p>
        </div>
        <div class="footer">
            <p>Thank you for booking with us!</p>
        </div>
    </div>
</body>
    </html>
`;

	return email;
};

const emailPaymentLink = (paymentLink) => {
	const email = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reservation Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #c5ddf6; }
            .container { background-color: #fff; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6f61; color: white; padding: 10px; text-align: center; margin-top:50px; margin-bottom:50px; }
            .content { padding-right: 20px; padding-left: 20px; text-align: left; }
            .footer { background: #ddd; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; }
            .roomType { font-weight: bold; text-transform: capitalize; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #ff6f61; color: white; }
            h2 { font-weight: bold; font-size: 1.5rem; }
            strong { font-weight: bold; }
            .confirmation {
                font-size: 1rem;
                font-weight: bold;
            }
            p {
                font-size: 1.2rem;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Your Payment Link</h1>
            </div>
            <div class="content">
                <p>Please click <a href="${paymentLink}" target="_blank" rel="noopener noreferrer">here</a> to pay:</p>
            </div>
            <div class="footer">
                <p>Thank you for booking with us!</p>
            </div>
        </div>
    </body>
    </html>
`;

	return email;
};

const paymentReceipt = (
	updatedReservation,
	hotelName,
	amountFromTheClient,
	transactionDetails
) => {
	// Convert dates to Saudi Arabia time zone
	const checkinDateSaudi = moment(updatedReservation.checkin_date)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");
	const checkoutDateSaudi = moment(updatedReservation.checkout_date)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");
	const bookedAtSaudi = moment(updatedReservation.booked_at)
		.tz("Asia/Riyadh")
		.format("dddd, MMMM Do YYYY");

	const checkinDate = moment(reservationData.checkin_date).tz("Asia/Riyadh");
	const checkoutDate = moment(reservationData.checkout_date).tz("Asia/Riyadh");

	const nightsOfResidence = checkoutDate.diff(checkinDate, "days");

	const email = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reservation Confirmation Update</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #c5ddf6; }
            .container { background-color: #fff; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff6f61; color: white; padding: 10px; text-align: center; }
            .content { padding-right: 20px; padding-left: 20px; text-align: left; }
            .footer { background: #ddd; padding: 10px; text-align: center; font-size: 14px; font-weight: bold; }
            .roomType { font-weight: bold; text-transform: capitalize; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #ff6f61; color: white; }
            h2 { font-weight: bold; font-size: 1.5rem; }
            strong { font-weight: bold; }
            .confirmation {
                font-size: 1rem;
                font-weight: bold;
            }
            h3 { font-weight: bold; font-size: 1.3rem; }
            h4 { font-weight: bold; font-size: 1.1rem; }

        </style>
    </head>
    <body>
    <div class="container">
        <div class="header">
            <h1>Reservation Payment Receipt</h1>
        </div>
        <div>
            <h2>${hotelName.toUpperCase()} Hotel</h2>
        </div>
        <h3>Thank you for your payment!</h3>
        <h4>Your Payment Receipt #: ${transactionDetails.transactionId}</h4>

        <div class="content">
        <p class="confirmation"><strong>Confirmation Number:</strong> ${
					updatedReservation.confirmation_number
				}</p>
            <p><strong>Guest Name:</strong> ${
							updatedReservation.customer_details.name
						}</p>
          
                        <p><strong>Reservation Status:</strong> ${
													updatedReservation.reservation_status
												}</p>
            <p><strong>Country:</strong> ${
							updatedReservation.customer_details.nationality
						}</p>
            <table>
                <tr>
                    <th>Room Type</th>
                    <td class="roomType">${updatedReservation.pickedRoomsType
											.map((room) => room.room_type)
											.join(", ")}</td>
                </tr>
               
                <tr>
                <th>Room Count</th>
                <td class="roomType">${updatedReservation.pickedRoomsType.reduce(
									(sum, item) => sum + (item.count || 0),
									0
								)}</td>
                </tr>
                
                <tr>
                <th>Check-in Date</th>
                <td>${checkinDateSaudi}</td>
            </tr>
            <tr>
                <th>Check-out Date</th>
                <td>${checkoutDateSaudi}</td>
            </tr>
                <tr>
                <th>Nights Of Residence</th>
                <td>${nightsOfResidence} Nights</td>
            </tr>
            <tr>
                <th>Guest Count</th>
                <td>${updatedReservation.total_guests}</td>
            </tr>
            <tr>
                <th>Payment Status</th>
                <td>PAID</td>
            </tr>
                <tr>
                    <th>Order Total</th>
                    <td>${Number(amountFromTheClient).toLocaleString()} SAR</td>
                </tr>
            </table>
            <p><strong>Booking Date:</strong> ${bookedAtSaudi}</p>
        </div>
        <div class="footer">
            <p>Thank you for booking with us!</p>
        </div>
    </div>
</body>
    </html>
`;

	return email;
};

module.exports = {
	confirmationEmail,
	reservationUpdate,
	emailPaymentLink,
	paymentReceipt,
};
