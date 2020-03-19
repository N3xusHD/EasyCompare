%% coefficients
t = 5;
k = 5.5;
A = -1/4194304*(k*pi - 128/t);
B = 3/32768*(k*pi - 128/t);
C = 1/t;

%% curve function
x = 0:1:255;
R = @(x) round(127.9999*sin(A*(x).^3 + B*(x).^2 + C*(x) - pi/2) + 127.5);
G = @(x) R(x - 5);
B = @(x) R(x + 5);

%% visiualization
figure("Name", "Solar Curve");
plot(x, R(x), "r");
hold on;
plot(x, G(x), "g");
plot(x, B(x), "b");
hold off
grid on
title("Solar Curve");
xlim([0, 255]);
ylim([0, 255]);

%% to string
fprintf("new Uint8Array([%s]),\nnew Uint8Array([%s]),\nnew Uint8Array([%s])\n",...
    sprintf("%d, ", R(x(1:(end-1)))) + R(x(end)),...
    sprintf("%d, ", G(x(1:(end-1)))) + G(x(end)),...
    sprintf("%d, ", B(x(1:(end-1)))) + B(x(end))...
);